"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, ShoppingBag } from "lucide-react";
import ShoppingList from "@/components/ShoppingList";
import styles from "./page.module.css";
import AddItemModal from "@/components/AddItemModal";
import { supabase } from "@/lib/supabase";
import { standardizeLocation } from "@/lib/location";
import { Header } from "./components/Header";
import { BottomNav } from "./components/BottomNav";
import { FeedTab } from "./components/FeedTab";
import { SettingsTab } from "./components/SettingsTab";

export default function Home() {
  const [activeTab, setActiveTabState] = useState("feed");

  // Custom setter to save to localStorage
  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      localStorage.setItem("activeTab", tab);
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCircle, setEditingCircle] = useState<any>(null);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [items, setItems] = useState<any[]>([]);
  const [circles, setCircles] = useState<any[]>([]);
  const [scrapedPosts, setScrapedPosts] = useState<any[]>([]);
  const [dbBuyers, setDbBuyers] = useState<any[]>([]);
  /* Settings State */
  const [appSettings, setAppSettings] = useState<{
    aiModel: string;
    ocrMethod: string;
    defaultBuyer: string;
    buyerList: string[];
  }>({
    aiModel: "gemini-3-flash-preview",
    ocrMethod: "vision",
    defaultBuyer: "",
    buyerList: ["Me", "Friend A", "Friend B"]
  });
  const [feedSearch, setFeedSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* Load Settings from LocalStorage */
  useEffect(() => {
    const savedSettings = localStorage.getItem("comiket_settings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        // Ensure buyerList exists for backward compatibility
        if (!parsed.buyerList || !Array.isArray(parsed.buyerList)) {
          parsed.buyerList = ["Me", "Friend A", "Friend B"];
        }
        setAppSettings(parsed);
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }, []);

  const fetchBuyers = async () => {
    try {
      const { data, error } = await supabase
        .from("buyers")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      setDbBuyers(data || []);
      return data || [];
    } catch (err) {
      console.error("Error fetching buyers:", err);
      return [];
    }
  };

  /* Migration Logic */
  useEffect(() => {
    const migrateBuyers = async () => {
      const currentDbBuyers = await fetchBuyers();
      const savedSettings = localStorage.getItem("comiket_settings");
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          if (currentDbBuyers.length === 0 && parsed.buyerList && Array.isArray(parsed.buyerList) && parsed.buyerList.length > 0) {
            console.log("Migrating buyers to database...");
            const toInsert = parsed.buyerList.map((name: string) => ({ name }));
            const { error } = await supabase.from("buyers").insert(toInsert);
            if (!error) {
              fetchBuyers();
            }
          }
        } catch (e) {
          console.error("Migration failed", e);
        }
      }
    };
    migrateBuyers();
  }, []);

  const migrateItemBuyers = async () => {
    // Only migrate if we have both items and dbBuyers
    if (items.length === 0 || dbBuyers.length === 0) return;

    const toMigrate = items.filter(item =>
      item.buyer &&
      (!item.item_buyers || item.item_buyers.length === 0)
    );

    if (toMigrate.length === 0) return;

    console.log(`Migrating ${toMigrate.length} items to item_buyers...`);

    const insertions: any[] = [];
    toMigrate.forEach(item => {
      const buyer = dbBuyers.find(b =>
        b.name.trim().toLowerCase() === item.buyer.trim().toLowerCase()
      );
      if (buyer) {
        insertions.push({
          item_id: item.id,
          buyer_id: buyer.id
        });
      }
    });

    if (insertions.length > 0) {
      const { error } = await supabase.from("item_buyers").insert(insertions);
      if (!error) {
        console.log("Successfully migrated items to item_buyers");
        fetchItems(true); // Silent refresh
      } else {
        console.error("Failed to migrate items:", error);
      }
    }
  };

  useEffect(() => {
    if (items.length > 0 && dbBuyers.length > 0) {
      migrateItemBuyers();
    }
  }, [items.length, dbBuyers.length]);

  // Restore tab from localStorage on mount
  useEffect(() => {
    const savedTab = localStorage.getItem("activeTab");
    if (savedTab) {
      setActiveTabState(savedTab);
    }
  }, []);


  // Save scroll position per tab
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const positions = JSON.parse(localStorage.getItem("scrollPositions") || "{}");
      positions[activeTab] = container.scrollTop;
      localStorage.setItem("scrollPositions", JSON.stringify(positions));
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [activeTab]);

  // Restore scroll position when tab changes
  useEffect(() => {
    const savedScrolls = localStorage.getItem("scrollPositions");
    if (savedScrolls && scrollRef.current) {
      try {
        const positions = JSON.parse(savedScrolls);
        if (positions[activeTab] !== undefined) {
          // Small delay to ensure tab content is swapped
          setTimeout(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = positions[activeTab];
            }
          }, 50);
        } else {
          scrollRef.current.scrollTop = 0;
        }
      } catch (e) {
        console.error("Failed to restore scroll position", e);
      }
    }
  }, [activeTab]);

  /* Location Migration Logic */
  const isMigrating = useRef(false);
  useEffect(() => {
    const migrateLocations = async () => {
      if (circles.length === 0 || isMigrating.current) return;

      const toMigrate = circles.filter(c => !c.formatted_location);
      if (toMigrate.length === 0) return;

      isMigrating.current = true;
      console.log(`Migrating ${toMigrate.length} circles to standardized locations...`);

      try {
        for (const circle of toMigrate) {
          const formatted = standardizeLocation(circle.area || "", circle.block || "", circle.space_number || "");
          if (formatted) {
            const { error } = await supabase
              .from("circles")
              .update({ formatted_location: formatted })
              .eq("id", circle.id);
            if (error) console.error(`Failed to migrate location for ${circle.artist}:`, error);
          }
        }
      } finally {
        isMigrating.current = false;
        if (toMigrate.length > 0) {
          fetchCircles(true);
        }
      }
    };
    migrateLocations();
  }, [circles.length]);

  /* PWA/Offline Logic */
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // Check initial state
    if (!navigator.onLine) setIsOffline(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  /* Save Settings */
  const updateSetting = (key: string, value: any) => {
    const newSettings = { ...appSettings, [key]: value };
    setAppSettings(newSettings);
    localStorage.setItem("comiket_settings", JSON.stringify(newSettings));
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

  const handleTabClick = (tab: string) => {
    if (activeTab === tab) {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      }
    } else {
      setActiveTab(tab);
    }
  };

  // ... existing fetch logic ...



  // Restore scroll position ONLY after loading is finished and tab is set
  useEffect(() => {
    if (loading) return;

    const savedScrolls = localStorage.getItem("scrollPositions");
    if (savedScrolls && scrollRef.current) {
      try {
        const positions = JSON.parse(savedScrolls);
        if (positions[activeTab]) {
          // Wait for one frame to ensure children are rendered
          const timer = setTimeout(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = positions[activeTab];
            }
          }, 50);
          return () => clearTimeout(timer);
        }
      } catch (e) {
        console.error("Failed to parse scroll positions", e);
      }
    }
  }, [loading, activeTab]);

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
      setItems(data || []);
    } catch (err: any) {
      console.error("Error fetching items:", err.message || err);
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
        .order("day", { ascending: true }).order("formatted_location", { ascending: true });

      if (error) throw error;
      setCircles(data || []);
    } catch (err) {
      console.error("Error fetching circles:", err);
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
      setScrapedPosts(data || []);
    } catch (err) {
      console.error("Error fetching posts:", err);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchCircles();
    fetchScrapedPosts();

    // Set up real-time subscription for scraped_posts
    const channel = supabase
      .channel("scraped_posts_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scraped_posts",
        },
        () => {
          fetchScrapedPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleMarkAsRead = async (postId: string) => {
    // Optimistic Update: Hide the post immediately
    setScrapedPosts(prev => prev.filter(p => p.id !== postId));

    const { error } = await supabase.from("scraped_posts").update({ is_read: true }).eq("id", postId);
    if (error) {
      // Re-fetch on error to ensure sync
      fetchScrapedPosts(true);
      console.error("Failed to mark as read", error);
    }
  };

  const handleImportPost = (post: any) => {
    setEditingCircle({
      name: "",
      artist: "",
      x_url: post.url,
      map_url: post.image_urls?.[0] || "",
      image_urls: post.image_urls || [],
      // Pass the raw data for AI to process further
      scrapedContent: post.content,
      scraped_id: post.id,
      username: post.username // Pass username as hint for AI
    });
    setIsModalOpen(true);
  };

  const handleDeleteCircle = async (id: string) => {
    if (!confirm("Delete this circle and all its items?")) return;
    const { error } = await supabase.from("circles").delete().eq("id", id);
    if (!error) {
      fetchCircles();
      fetchItems(); // Refresh items as they cascade delete
    }
  };

  return (
    <div className={styles.dashboard}>
      <Header
        isOffline={isOffline}
        deferredPrompt={deferredPrompt}
        handleInstallClick={handleInstallClick}
        onOpenSettings={() => setActiveTab("settings")}
      />

      {/* Main Content Area */}
      <div className={styles.contentScroll} ref={scrollRef}>
        <section className={styles.feedContainer}>
          {loading ? (
            <div className={styles.loadingWrapper}>
              <p className={styles.loadingItems}>Loading items...</p>
            </div>
          ) : activeTab === "list" ? (
            items.length > 0 ? (
              <ShoppingList
                items={items}
                dbBuyers={dbBuyers}
                onUpdate={(silent = false) => {
                  fetchItems(silent);
                  fetchCircles(silent);
                }}
                onEditCircle={async (circle, step) => {
                  // Ensure we have the full circle data including items
                  let fullCircle = circles.find((c) => c.id === circle.id);
                  if (!fullCircle) {
                    const { data } = await supabase
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
                      .eq("id", circle.id)
                      .single();
                    if (data) fullCircle = data;
                  }
                  setEditingCircle(fullCircle || circle);
                  setModalStep(step || 1);
                  setIsModalOpen(true);
                }}
              />
            ) : (
              <div className={styles.emptyState}>
                <div className={`${styles.emptyIcon} glass`}>
                  <ShoppingBag size={48} className={styles.mutedIcon} />
                </div>
                <h2>No items yet</h2>
                <p>Select items to buy from the feed</p>
                <button
                  className={styles.primaryBtn}
                  onClick={() => {
                    setEditingCircle(null);
                    setIsModalOpen(true);
                  }}
                >
                  Add Item Manually
                </button>
              </div>
            )
          ) : activeTab === "settings" ? (
            <SettingsTab
              appSettings={appSettings}
              updateSetting={updateSetting}
              dbBuyers={dbBuyers}
              addBuyer={addBuyer}
              removeBuyer={removeBuyer}
              updateBuyerName={updateBuyerName}
            />
          ) : activeTab === "map" ? (
            <div className={styles.emptyState}>
              <div className={`${styles.emptyIcon} glass`}>
                <MapPin size={48} className={styles.mutedIcon} />
              </div>
              <h2>Map View</h2>
              <p>Circle location visualization coming soon...</p>
            </div>
          ) : (
            <FeedTab
              feedSearch={feedSearch}
              setFeedSearch={setFeedSearch}
              viewMode={viewMode}
              setViewMode={setViewMode}
              scrapedPosts={scrapedPosts}
              handleMarkAsRead={handleMarkAsRead}
              handleImportPost={handleImportPost}
              circles={circles}
              onEditCircle={(circle, step) => {
                setEditingCircle(circle);
                setModalStep(step || 1);
                setIsModalOpen(true);
              }}
              onDeleteCircle={handleDeleteCircle}
            />
          )}
        </section>
      </div>

      <BottomNav
        activeTab={activeTab}
        onTabClick={handleTabClick}
        onAddClick={() => {
          setEditingCircle(null);
          setIsModalOpen(true);
        }}
      />

      <AnimatePresence>
        {isModalOpen && (
          <AddItemModal
            isOpen={isModalOpen}
            initialData={editingCircle}
            initialStep={modalStep}
            globalSettings={appSettings}
            dbBuyers={dbBuyers}
            onClose={() => {
              setIsModalOpen(false);
              setEditingCircle(null);
              setModalStep(1); // Reset
            }}
            onSuccess={() => {
              fetchCircles(true);
              fetchItems(true);
              fetchScrapedPosts(); // Update inbox immediately
              setIsModalOpen(false);
              setEditingCircle(null);
              setModalStep(1);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
