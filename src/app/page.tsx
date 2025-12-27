"use client";

import { useState, useEffect } from "react";
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
import styles from "./page.module.css";
import AddItemModal from "@/components/AddItemModal";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState<"feed" | "list" | "map">("feed");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
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
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase Error Details:", error);
        throw error;
      };
      setItems(data || []);
    } catch (err: any) {
      console.error("Error fetching items:", err.message || err);
    } finally {
      setLoading(false);
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
    fetchScrapedPosts();
  }, []);

  const handleIgnorePost = async (postId: string) => {
    await supabase.from("scraped_posts").update({ is_ignored: true }).eq("id", postId);
    fetchScrapedPosts();
  };

  const handleImportPost = (post: any) => {
    // For now, just open modal.
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
              <div className={viewMode === "grid" ? styles.grid : styles.list}>
                {items.map((item, index) => (
                  <div key={item.id || `fallback-${index}`} className={`${styles.itemCard} glass-card`}>
                    <div className={styles.cardHeader}>
                      <div className={styles.circleInfo}>
                        <h3>{item.circles?.name}</h3>
                        <p className={styles.artistName}>@{item.circles?.artist || "unknown"}</p>
                      </div>
                      <div className={styles.locationBadge}>
                        <MapPin size={12} />
                        {item.circles?.space_number}
                      </div>
                    </div>
                    <div className={styles.itemContent}>
                      <p className={styles.itemName}>{item.name}</p>
                      <p className={styles.itemPrice}>¥{item.price.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <div className={`${styles.emptyIcon} glass`}>
                  <ShoppingBag size={48} className={styles.mutedIcon} />
                </div>
                <h2>No items yet</h2>
                <p>Add items from the feed or manually</p>
                <button className={styles.primaryBtn} onClick={() => setIsModalOpen(true)}>
                  Add Item Manually
                </button>
              </div>
            )
          ) : (
            /* Feed Tab */
            scrapedPosts.length > 0 ? (
              <div className={styles.list}>
                {scrapedPosts.map((post) => (
                  <div key={post.id} className={`${styles.postCard} glass-card`}>
                    <div className={styles.postBody}>
                      <p className={styles.postText}>{post.content || "No content"}</p>
                      <div className={styles.postActions}>
                        <button className={styles.secondaryBtn} onClick={() => handleIgnorePost(post.id)}>Ignore</button>
                        <button className={styles.primaryBtn} onClick={() => handleImportPost(post)}>Import Info</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <div className={`${styles.emptyIcon} glass`}>
                  <Compass size={48} className={styles.mutedIcon} />
                </div>
                <h2>Feed is empty</h2>
                <p>Try fetching new posts</p>
              </div>
            )
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
          <button className={styles.fab} onClick={() => setIsModalOpen(true)}>
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
      <AddItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchItems();
          fetchScrapedPosts();
        }}
      />
    </div>
  );
}
