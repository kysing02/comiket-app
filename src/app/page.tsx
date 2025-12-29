"use client";

import { useState, useEffect, useRef } from "react";
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
  Trash2,
  WifiOff,
  Download,
  LayoutGrid,
  LayoutList
} from "lucide-react";
import ShoppingList from "@/components/ShoppingList";
import ArtistCard from "@/components/ArtistCard";
import styles from "./page.module.css";
import AddItemModal from "@/components/AddItemModal";
import { supabase } from "@/lib/supabase";
import { standardizeLocation } from "@/lib/location";

export default function Home() {
  const [activeTab, setActiveTab] = useState("feed");
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
      {/* Top Header */}
      <header className={`${styles.header} glass`}>
        <div className={styles.headerContent}>
          <h1>C107 <span className={styles.textGradient}>Tracker</span></h1>
          <div className={styles.headerActions}>
            {isOffline && (
              <div className={styles.offlineBadge} title="Offline Mode">
                <WifiOff size={16} />
                <span>Offline</span>
              </div>
            )}
            {deferredPrompt && (
              <button className={`${styles.iconBtn} ${styles.installBtn}`} onClick={handleInstallClick}>
                <Download size={20} />
              </button>
            )}
            <button className={styles.iconBtn} onClick={() => setActiveTab("settings")}>
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

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
                onUpdate={(silent = false) => { fetchItems(silent); fetchCircles(silent); }}
                onEditCircle={async (circle, step) => {
                  // Ensure we have the full circle data including items
                  let fullCircle = circles.find(c => c.id === circle.id);
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
                  {dbBuyers.map((buyer) => (
                    <div key={buyer.id} className={styles.buyerRow}>
                      <input
                        type="text"
                        value={buyer.name}
                        onChange={(e) => updateBuyerName(buyer.id, e.target.value)}
                        className={styles.buyerInput}
                      />
                      <button className={styles.removeBtn} onClick={() => removeBuyer(buyer.id)}>
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
                    {dbBuyers.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
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
              <div className={styles.feedSearchWrapper}>
                <div className={styles.searchBox}>
                  <Search size={18} className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search artist, circle, or content..."
                    value={feedSearch}
                    onChange={(e) => setFeedSearch(e.target.value)}
                    className="glass"
                  />
                </div>
                <div className={styles.viewToggle}>
                  <button
                    className={`${styles.toggleBtn} ${viewMode === 'grid' ? styles.active : ''}`}
                    onClick={() => setViewMode('grid')}
                    title="Grid View"
                  >
                    <LayoutGrid size={18} />
                  </button>
                  <button
                    className={`${styles.toggleBtn} ${viewMode === 'list' ? styles.active : ''}`}
                    onClick={() => setViewMode('list')}
                    title="List View"
                  >
                    <LayoutList size={18} />
                  </button>
                </div>
              </div>

              {scrapedPosts.filter(p => !feedSearch ||
                p.content?.toLowerCase().includes(feedSearch.toLowerCase()) ||
                p.username?.toLowerCase().includes(feedSearch.toLowerCase())
              ).length > 0 && (
                  <section className={styles.scrapedSection}>
                    <h3 className={styles.sectionTitle}>Inbox: Scraped from X ({scrapedPosts.filter(p => !feedSearch || p.content?.toLowerCase().includes(feedSearch.toLowerCase()) || p.username?.toLowerCase().includes(feedSearch.toLowerCase())).length})</h3>
                    <div className={styles.scrapedGrid}>
                      {scrapedPosts.filter(p => !feedSearch ||
                        p.content?.toLowerCase().includes(feedSearch.toLowerCase()) ||
                        p.username?.toLowerCase().includes(feedSearch.toLowerCase())
                      ).map((post) => (
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

              <div className={viewMode === "grid" ? styles.artistGrid : styles.artistList}>
                {circles.filter(c => !feedSearch ||
                  c.name?.toLowerCase().includes(feedSearch.toLowerCase()) ||
                  c.artist?.toLowerCase().includes(feedSearch.toLowerCase())
                ).length > 0 ? (
                  circles.filter(c => !feedSearch ||
                    c.name?.toLowerCase().includes(feedSearch.toLowerCase()) ||
                    c.artist?.toLowerCase().includes(feedSearch.toLowerCase())
                  ).map((circle) => (
                    <ArtistCard
                      key={circle.id}
                      circle={circle}
                      variant={viewMode === "grid" ? "card" : "row"}
                      onEdit={(step) => {
                        setEditingCircle(circle);
                        setModalStep(step || 1);
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
          onClick={() => handleTabClick("feed")}
        >
          <Compass size={22} />
          <span>Feed</span>
        </button>
        <button
          className={activeTab === "list" ? styles.active : ""}
          onClick={() => handleTabClick("list")}
        >
          <ShoppingBag size={22} />
          <span>List</span>
        </button>
        <div style={{ width: "60px" }}></div>
        <button
          className={activeTab === "map" ? styles.active : ""}
          onClick={() => handleTabClick("map")}
        >
          <MapPin size={22} />
          <span>Map</span>
        </button>
        <button
          className={activeTab === "settings" ? styles.active : ""}
          onClick={() => handleTabClick("settings")}
        >
          <Settings size={22} />
          <span>Settings</span>
        </button>
        <button className={styles.fab} onClick={() => { setEditingCircle(null); setIsModalOpen(true); }} title="Add Item">
          <Plus size={32} />
        </button>
      </nav>
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
