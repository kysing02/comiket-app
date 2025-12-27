"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Grid,
  List,
  Plus,
  ShoppingBag,
  Compass,
  Settings,
  Filter,
  MapPin
} from "lucide-react";
import ShoppingList from "@/components/ShoppingList";
import ArtistCard from "@/components/ArtistCard";
import styles from "./page.module.css";
import AddItemModal from "@/components/AddItemModal";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState<"feed" | "list" | "map">("feed");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCircle, setEditingCircle] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [circles, setCircles] = useState<any[]>([]);
  const [scrapedPosts, setScrapedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("items")
        .select(`
          *,
          circles (*)
        `)
        .eq("is_wanted", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err: any) {
      console.error("Error fetching items:", err.message || err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCircles = async () => {
    try {
      const { data, error } = await supabase
        .from("circles")
        .select(`
          *,
          items (*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCircles(data || []);
    } catch (err) {
      console.error("Error fetching circles:", err);
    }
  };

  const fetchScrapedPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("scraped_posts")
        .select("*")
        .eq("is_read", false)
        .eq("is_ignored", false)
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
  }, []);

  const handleIgnorePost = async (postId: string) => {
    await supabase.from("scraped_posts").update({ is_ignored: true }).eq("id", postId);
    fetchScrapedPosts();
  };

  const handleImportPost = (post: any) => {
    setEditingCircle({
      name: "",
      artist: "",
      x_url: post.url,
      map_url: post.image_urls?.[0] || "",
      // Pass the raw data for AI to process further
      scrapedContent: post.content
    });
    setIsModalOpen(true);
  };

  return (
    <div className={styles.dashboard}>
      {/* Top Header */}
      <header className={`${styles.header} glass`}>
        <div className={styles.headerContent}>
          <h1>C107 <span className={styles.textGradient}>Tracker</span></h1>
          <div className={styles.headerActions}>
            <button className={styles.iconBtn}>
              <Search size={20} />
            </button>
            <button className={styles.iconBtn}>
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className={styles.contentScroll}>
        <div className={styles.viewControls}>
          <div className={`${styles.filterChip} glass`}>
            <Filter size={14} />
            <span>{activeTab === "feed" ? "Scraped Posts" : "My List"}</span>
          </div>
          {activeTab === "list" && (
            <div className={`${styles.toggleGroup} glass`}>
              <button
                className={viewMode === "grid" ? styles.active : ""}
                onClick={() => setViewMode("grid")}
              >
                <Grid size={18} />
              </button>
              <button
                className={viewMode === "list" ? styles.active : ""}
                onClick={() => setViewMode("list")}
              >
                <List size={18} />
              </button>
            </div>
          )}
        </div>

        <section className={styles.feedContainer}>
          {loading ? (
            <p className={styles.loadingItems}>Loading items...</p>
          ) : activeTab === "list" ? (
            items.length > 0 ? (
              <ShoppingList items={items} onUpdate={() => { fetchItems(); fetchCircles(); }} />
            ) : (
              <div className={styles.emptyState}>
                <div className={`${styles.emptyIcon} glass`}>
                  <ShoppingBag size={48} className={styles.mutedIcon} />
                </div>
                <h2>No items yet</h2>
                <p>Select items to buy from the feed</p>
                <button className={styles.primaryBtn} onClick={() => { setEditingCircle(null); setIsModalOpen(true); }}>
                  Add Item Manually
                </button>
              </div>
            )
          ) : (
            /* New Feed Tab: Registered Artists & Scraped Inbox */
            <div className={styles.feedScrollArea}>
              {scrapedPosts.length > 0 && (
                <section className={styles.scrapedSection}>
                  <h3 className={styles.sectionTitle}>Inbox: Scraped from X ({scrapedPosts.length})</h3>
                  <div className={styles.scrapedGrid}>
                    {scrapedPosts.map((post) => (
                      <div key={post.id} className={`${styles.scrapedCard} glass`}>
                        <div className={styles.scrapedContent}>
                          <p>{post.content}</p>
                          {post.image_urls?.length > 0 && (
                            <div className={styles.scrapedImages}>
                              {post.image_urls.slice(0, 4).map((img: string, i: number) => (
                                <img key={i} src={img} alt="Preview" />
                              ))}
                            </div>
                          )}
                        </div>
                        <div className={styles.scrapedActions}>
                          <button
                            className={styles.ignoreBtn}
                            onClick={() => handleIgnorePost(post.id)}
                          >
                            Ignore
                          </button>
                          <button
                            className={styles.importBtn}
                            onClick={() => handleImportPost(post)}
                          >
                            Import
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <div className={styles.artistFeed}>
                {circles.length > 0 ? (
                  circles.map((circle) => (
                    <ArtistCard
                      key={circle.id}
                      circle={circle}
                      onEdit={() => {
                        setEditingCircle(circle);
                        setIsModalOpen(true);
                      }}
                    />
                  ))
                ) : (
                  <div className={styles.emptyState}>
                    <div className={`${styles.emptyIcon} glass`}>
                      <Compass size={48} className={styles.mutedIcon} />
                    </div>
                    <h2>Feed is empty</h2>
                    <p>Register artists via X Scraper or "+" button</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Bottom Navigation */}
      <nav className={`${styles.bottomNav} glass`}>
        <button
          className={activeTab === "feed" ? styles.active : ""}
          onClick={() => setActiveTab("feed")}
        >
          <Compass size={24} />
          <span>Feed</span>
        </button>
        <button
          className={activeTab === "list" ? styles.active : ""}
          onClick={() => setActiveTab("list")}
        >
          <ShoppingBag size={24} />
          <span>List</span>
        </button>
        <div className={styles.fabContainer}>
          <button className={styles.fab} onClick={() => { setEditingCircle(null); setIsModalOpen(true); }}>
            <Plus size={32} color="white" />
          </button>
        </div>
        <button
          className={activeTab === "map" ? styles.active : ""}
          onClick={() => setActiveTab("map")}
        >
          <Grid size={24} />
          <span>Map</span>
        </button>
        <button>
          <Settings size={24} />
          <span>More</span>
        </button>
      </nav>
      <AnimatePresence>
        {isModalOpen && (
          <AddItemModal
            isOpen={isModalOpen}
            initialData={editingCircle}
            onClose={() => {
              setIsModalOpen(false);
              setEditingCircle(null);
            }}
            onSuccess={() => {
              fetchItems();
              fetchCircles();
              setActiveTab("list");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
