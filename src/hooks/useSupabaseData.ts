"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { standardizeLocation } from "@/lib/location";
import { logger } from "@/lib/logger";

export function useSupabaseData() {
    const [items, setItems] = useState<any[]>([]);
    const [circles, setCircles] = useState<any[]>([]);
    const [scrapedPosts, setScrapedPosts] = useState<any[]>([]);
    const [dbBuyers, setDbBuyers] = useState<any[]>([]);
    const [aiPaused, setAiPaused] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchItems = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { data, error } = await supabase
                .from("items")
                .select(`
          *,
          circles (*),
          item_buyers (
            buyer_id,
            buyers (name)
          )
        `)
                .order("created_at", { ascending: false });

            if (error) throw error;
            logger.db(`Fetched ${data?.length || 0} items`);
            setItems(data || []);
        } catch (err: any) {
            logger.db(`Error fetching items: ${err.message || err}`, err, 'ERROR');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const fetchCircles = async (silent = false) => {
        try {
            const { data, error } = await supabase
                .from("circles")
                .select(`
          *,
          items (
            *,
            item_buyers (
              buyer_id,
              buyers (name)
            )
          )
        `)
                .order("day", { ascending: true })
                .order("formatted_location", { ascending: true });

            if (error) throw error;
            logger.db(`Fetched ${data?.length || 0} circles`);
            setCircles(data || []);
        } catch (err) {
            logger.db(`Error fetching circles`, err, 'ERROR');
        }
    };

    const fetchScrapedPosts = async (silent = false) => {
        try {
            const { data, error } = await supabase
                .from("scraped_posts")
                .select("*")
                .eq("is_read", false)
                .order("created_at", { ascending: false });

            if (error) throw error;
            logger.db(`Fetched ${data?.length || 0} scraped posts`);
            setScrapedPosts(data || []);
        } catch (err) {
            logger.db(`Error fetching posts`, err, 'ERROR');
        }
    };

    const fetchBuyers = async () => {
        try {
            const { data, error } = await supabase
                .from("buyers")
                .select("*")
                .order("created_at", { ascending: true });
            if (error) throw error;
            logger.db(`Fetched ${data?.length || 0} buyers`);
            setDbBuyers(data || []);
            return data || [];
        } catch (err) {
            logger.db(`Error fetching buyers`, err, 'ERROR');
            return [];
        }
    };

    const fetchAppSettings = async () => {
        try {
            const { data, error } = await supabase
                .from("app_settings")
                .select("*")
                .eq("id", "global")
                .single();
            if (error) throw error;
            setAiPaused(data?.ai_extraction_paused || false);
        } catch (err) {
            logger.db(`Error fetching app settings`, err, 'ERROR');
        }
    };

    const toggleAiExtraction = async () => {
        const newValue = !aiPaused;
        const { error } = await supabase
            .from("app_settings")
            .update({ ai_extraction_paused: newValue })
            .eq("id", "global");
        if (!error) setAiPaused(newValue);
    };

    // Initial Fetch & Subscription
    useEffect(() => {
        fetchItems();
        fetchCircles();
        fetchScrapedPosts();
        fetchBuyers();
        fetchAppSettings();

        const channel = supabase
            .channel("scraped_posts_changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "scraped_posts" },
                () => fetchScrapedPosts(true)
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "app_settings" },
                () => fetchAppSettings()
            )
            .subscribe();

        // Heartbeat for background worker
        const triggerWorker = async () => {
            try {
                await fetch('/api/worker');
            } catch (e) {
                console.error("Worker heartbeat failed", e);
            }
        };

        // Trigger immediately on load and then every 60s
        triggerWorker();
        const heartbeat = setInterval(triggerWorker, 60000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(heartbeat);
        };
    }, []);

    // Migration: Buyers
    useEffect(() => {
        const migrateBuyers = async () => {
            const currentDbBuyers = await fetchBuyers();
            const savedSettings = localStorage.getItem("comiket_settings");
            if (savedSettings) {
                try {
                    const parsed = JSON.parse(savedSettings);
                    if (currentDbBuyers.length === 0 && parsed.buyerList?.length > 0) {
                        logger.app("Migrating buyers to database...");
                        const toInsert = parsed.buyerList.map((name: string) => ({ name }));
                        const { error } = await supabase.from("buyers").insert(toInsert);
                        if (!error) {
                            logger.db("Migrated buyers successfully");
                            fetchBuyers();
                        } else {
                            logger.db("Failed to migrate buyers", error, 'ERROR');
                        }
                    }
                } catch (e) {
                    logger.app("Migration failed", e, 'ERROR');
                }
            }
        };
        migrateBuyers();
    }, []);

    // Migration: Item Buyers
    useEffect(() => {
        const migrateItemBuyers = async () => {
            if (items.length === 0 || dbBuyers.length === 0) return;

            const toMigrate = items.filter(item =>
                item.buyer && (!item.item_buyers || item.item_buyers.length === 0)
            );

            if (toMigrate.length === 0) return;

            logger.app(`Migrating ${toMigrate.length} items to item_buyers...`);
            const insertions: any[] = [];
            toMigrate.forEach(item => {
                const buyer = dbBuyers.find(b =>
                    b.name.trim().toLowerCase() === item.buyer.trim().toLowerCase()
                );
                if (buyer) {
                    insertions.push({ item_id: item.id, buyer_id: buyer.id });
                }
            });

            if (insertions.length > 0) {
                const { error } = await supabase.from("item_buyers").insert(insertions);
                if (!error) {
                    logger.db(`Migrated ${insertions.length} item-buyer links`);
                    fetchItems(true);
                } else {
                    logger.db("Failed to migrate item_buyers", error, 'ERROR');
                }
            }
        };
        migrateItemBuyers();
    }, [items.length, dbBuyers.length]);

    // Migration: Locations
    const isMigrating = useRef(false);
    useEffect(() => {
        const migrateLocations = async () => {
            if (circles.length === 0 || isMigrating.current) return;
            const toMigrate = circles.filter(c => !c.formatted_location);
            if (toMigrate.length === 0) return;

            isMigrating.current = true;
            try {
                for (const circle of toMigrate) {
                    const formatted = standardizeLocation(circle.area || "", circle.block || "", circle.space_number || "");
                    if (formatted) {
                        await supabase.from("circles").update({ formatted_location: formatted }).eq("id", circle.id);
                    }
                }
            } finally {
                isMigrating.current = false;
                fetchCircles(true);
            }
        };
        migrateLocations();
    }, [circles.length]);

    const handleMarkAsRead = async (postId: string) => {
        setScrapedPosts(prev => prev.filter(p => p.id !== postId));
        const { error } = await supabase.from("scraped_posts").update({ is_read: true }).eq("id", postId);
        if (error) fetchScrapedPosts(true);
    };

    const addBuyer = async () => {
        const newBuyerName = `Friend ${dbBuyers.length + 1}`;
        const { error } = await supabase.from("buyers").insert({ name: newBuyerName });
        if (!error) fetchBuyers();
    };

    const removeBuyer = async (id: string) => {
        const { error } = await supabase.from("buyers").delete().eq("id", id);
        if (!error) fetchBuyers();
    };

    const updateBuyerName = async (id: string, name: string) => {
        const { error } = await supabase.from("buyers").update({ name }).eq("id", id);
        if (!error) fetchBuyers();
    };

    const handleDeleteCircle = async (id: string) => {
        if (!confirm("Delete this circle and all its items?")) return;
        const { error } = await supabase.from("circles").delete().eq("id", id);
        if (!error) {
            fetchCircles();
            fetchItems();
        }
    };

    return {
        items,
        circles,
        scrapedPosts,
        dbBuyers,
        loading,
        fetchItems,
        fetchCircles,
        fetchScrapedPosts,
        handleMarkAsRead,
        addBuyer,
        removeBuyer,
        updateBuyerName,
        handleDeleteCircle,
        aiPaused,
        toggleAiExtraction
    };
}
