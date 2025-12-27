"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  List,
  Plus,
  ShoppingBag,
  Compass,
  Settings,
  Filter,
  MapPin,
  Trash2
} from "lucide-react";
import ShoppingList from "@/components/ShoppingList";
import ArtistCard from "@/components/ArtistCard";
import styles from "./page.module.css";
import AddItemModal from "@/components/AddItemModal";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [activeTab, setActiveTab] = useState("feed");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCircle, setEditingCircle] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [circles, setCircles] = useState<any[]>([]);
  const [scrapedPosts, setScrapedPosts] = useState<any[]>([]);
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

  /* Save Settings */
  const updateSetting = (key: string, value: any) => {
    const newSettings = { ...appSettings, [key]: value };
    setAppSettings(newSettings);
    localStorage.setItem("comiket_settings", JSON.stringify(newSettings));
  };

  const addBuyer = () => {
    const newBuyer = `Friend ${appSettings.buyerList.length + 1}`;
    updateSetting("buyerList", [...appSettings.buyerList, newBuyer]);
  };

  const removeBuyer = (index: number) => {
    const newList = [...appSettings.buyerList];
    newList.splice(index, 1);
    updateSetting("buyerList", newList);
  };

  const updateBuyerName = (index: number, name: string) => {
    const newList = [...appSettings.buyerList];
    newList[index] = name;
    updateSetting("buyerList", newList);
  };

  // ... existing fetch logic ...

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
    await supabase.from("scraped_posts").update({ is_read: true }).eq("id", postId);
    fetchScrapedPosts();
  };

  const handleImportPost = (post: any) => {
    setEditingCircle({
      name: "",
      artist: "",
      x_url: post.url,
      map_url: post.image_urls?.[0] || "",
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
      {/* Top Header */}
      <header className={`${styles.header} glass`}>
        <div className={styles.headerContent}>
          <h1>C107 <span className={styles.textGradient}>Tracker</span></h1>
          <div className={styles.headerActions}>
            <button className={styles.iconBtn}>
              <Search size={20} />
            </button>
            <button className={styles.iconBtn} onClick={() => setActiveTab("settings")}>
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
            <span>{activeTab === "feed" ? "Scraped Posts" : activeTab === "list" ? "My List" : activeTab === "settings" ? "Settings" : "Event Map"}</span>
          </div>
          {activeTab === "list" && (
            <div className={`${styles.filterChip} glass`}>
              <List size={14} />
              <span>items</span>
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
          ) : activeTab === "settings" ? (
            <div className={styles.settingsArea}>
              <h2 className={styles.sectionTitle}>App Settings</h2>

              <div className={`${styles.settingsGroup} glass`}>
                <h3>AI & OCR Configuration</h3>
                <div className={styles.settingItem}>
                  <label>AI Model</label>
                  <select
                    value={appSettings.aiModel}
                    onChange={(e) => updateSetting("aiModel", e.target.value)}
                    className="glass"
                  >
                    <option value="gpt-4o-mini">GPT-4o mini (Current)</option>
                    <option value="gemini-3-flash-preview">Gemini 3.0 Flash Preview</option>
                  </select>
                </div>
                <div className={styles.settingItem}>
                  <label>OCR Method</label>
                  <select
                    value={appSettings.ocrMethod}
                    onChange={(e) => updateSetting("ocrMethod", e.target.value)}
                    className="glass"
                  >
                    <option value="combined">Tesseract + AI (Recommended)</option>
                    <option value="vision">Vision Only (Fastest)</option>
                    <option value="tesseract">Tesseract Only (Local)</option>
                  </select>
                </div>
              </div>

              <div className={`${styles.settingsGroup} glass`}>
                <div className={styles.groupHeader}>
                  <h3>Buyer Management</h3>
                  <button className={styles.iconBtnSmall} onClick={addBuyer}>
                    <Plus size={16} /> Add
                  </button>
                </div>
                <div className={styles.buyerList}>
                  {appSettings.buyerList.map((buyer, index) => (
                    <div key={index} className={styles.buyerRow}>
                      <input
                        type="text"
                        value={buyer}
                        onChange={(e) => updateBuyerName(index, e.target.value)}
                        className={styles.buyerInput}
                      />
                      <button className={styles.removeBtn} onClick={() => removeBuyer(index)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className={styles.settingItem}>
                  <label>Default Buyer (Auto-fill)</label>
                  <select
                    value={appSettings.defaultBuyer}
                    onChange={(e) => updateSetting("defaultBuyer", e.target.value)}
                    className="glass"
                  >
                    <option value="">None (Select manually)</option>
                    {appSettings.buyerList.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.settingsFooter}>
                <p>Comiket C107 Tracker v0.5.1</p>
                <p>All data is synced to Supabase</p>
              </div>
            </div>
          ) : activeTab === "map" ? (
            <div className={styles.emptyState}>
              <div className={`${styles.emptyIcon} glass`}>
                <MapPin size={48} className={styles.mutedIcon} />
              </div>
              <h2>Map View</h2>
              <p>Circle location visualization coming soon...</p>
            </div>
          ) : (
            /* New Feed Tab: Registered Artists & Scraped Inbox */
            <div className={styles.feedScrollArea}>
              {scrapedPosts.length > 0 && (
                <section className={styles.scrapedSection}>
                  <h3 className={styles.sectionTitle}>Inbox: Scraped from X ({scrapedPosts.length})</h3>
                  <div className={styles.scrapedGrid}>
                    {scrapedPosts.map((post) => (
                      <div key={post.id} className={`${styles.scrapedCard} glass`}>
                        <div className={styles.scrapedHeader}>
                          <span className={styles.scrapedArtist}>{post.username || "X Post"}</span>
                        </div>
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
                            onClick={() => handleMarkAsRead(post.id)}
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
                      onDelete={handleDeleteCircle}
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
      <nav className={styles.bottomNav}>
        <button
          className={activeTab === "feed" ? styles.active : ""}
          onClick={() => setActiveTab("feed")}
        >
          <Compass size={22} />
          <span>Feed</span>
        </button>
        <button
          className={activeTab === "list" ? styles.active : ""}
          onClick={() => setActiveTab("list")}
        >
          <ShoppingBag size={22} />
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
          <MapPin size={22} />
          <span>Map</span>
        </button>
        <button
          className={activeTab === "settings" ? styles.active : ""}
          onClick={() => setActiveTab("settings")}
        >
          <Settings size={22} />
          <span>Settings</span>
        </button>
      </nav>
      <AnimatePresence>
        {isModalOpen && (
          <AddItemModal
            isOpen={isModalOpen}
            initialData={editingCircle}
            globalSettings={appSettings}
            onClose={() => {
              setIsModalOpen(false);
              setEditingCircle(null);
            }}
            onSuccess={() => {
              fetchItems();
              fetchCircles();
              fetchScrapedPosts(); // Update inbox immediately
              setActiveTab("feed"); // Redirect to Feed
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
