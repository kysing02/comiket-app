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
import { ShoppingStats } from "@/components/ShoppingList/components/ShoppingStats";
import { ShoppingListFilterModal } from "@/components/ShoppingList/components/ShoppingListFilterModal";
import { Filter, Search, LayoutGrid, LayoutList } from "lucide-react";

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

  // Lifted Filter/Sort State (from ShoppingList)
  const [filterDay, setFilterDay] = useState<string | null>(null);
  const [filterArea, setFilterArea] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBuyer, setFilterBuyer] = useState<string | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'circle', direction: 'asc' });
  const [isFiltersInitialized, setIsFiltersInitialized] = useState(false);

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

    // Load Filters
    const savedFilters = localStorage.getItem("shopping_list_filters");
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        setFilterDay(parsed.filterDay || null);
        setFilterArea(parsed.filterArea || null);
        setFilterPriority(parsed.filterPriority || []);
        setFilterTags(parsed.filterTags || []);
        setFilterBuyer(parsed.filterBuyer || null);
        setSearchQuery(parsed.searchQuery || "");
        if (parsed.sortConfig) setSortConfig(parsed.sortConfig);
      } catch (e) {
        console.error("Failed to load filters", e);
      }
    }
    setIsFiltersInitialized(true);
  }, []);

  // Save Filters
  useEffect(() => {
    if (!isFiltersInitialized) return;
    const toSave = {
      filterDay,
      filterArea,
      filterPriority,
      filterTags,
      filterBuyer,
      searchQuery,
      sortConfig
    };
    localStorage.setItem("shopping_list_filters", JSON.stringify(toSave));
  }, [filterDay, filterArea, filterPriority, filterTags, filterBuyer, searchQuery, sortConfig, isFiltersInitialized]);


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

  const togglePriorityFilter = (priority: string) => {
    if (filterPriority.includes(priority)) {
      setFilterPriority(filterPriority.filter(p => p !== priority));
    } else {
      setFilterPriority([...filterPriority, priority]);
    }
  };

  const toggleTagFilter = (color: string) => {
    if (filterTags.includes(color)) {
      setFilterTags(filterTags.filter(c => c !== color));
    } else {
      setFilterTags([...filterTags, color]);
    }
  };

  const clearPriorityFilter = () => setFilterPriority([]);
  const clearTagFilter = () => setFilterTags([]);

  const getSortedItems = (items: any[]) => {
    if (!sortConfig) return items;

    return [...items].sort((a, b) => {
      let aVal, bVal;

      switch (sortConfig.key) {
        case 'status':
          aVal = a.is_purchased ? 1 : 0;
          bVal = b.is_purchased ? 1 : 0;
          break;
        case 'circle': // Sort by Day then Space
          aVal = `${a.circles?.day || "9"}-${a.circles?.formatted_location || ""}`;
          bVal = `${b.circles?.day || "9"}-${b.circles?.formatted_location || ""}`;
          break;
        case 'gojuon': // Sort by 東 あ-わ -> 西 あ-わ -> A-Z
          const getSortKey = (item: any) => {
            const areaOrder = item.circles?.area === "東" ? "1" : (item.circles?.area === "西" ? "2" : "3");
            return `${areaOrder}-${item.circles?.name || ""}`;
          };
          aVal = getSortKey(a);
          bVal = getSortKey(b);
          const result = aVal.localeCompare(bVal, 'ja');
          return sortConfig.direction === 'asc' ? result : -result;
        case 'price':
          aVal = a.price || 0;
          bVal = b.price || 0;
          break;
        case 'priority': // High > Medium > Low
          const pMap: any = { "High": 3, "Medium": 2, "Low": 1 };
          aVal = pMap[a.priority] || 0;
          bVal = pMap[b.priority] || 0;
          break;
        case 'buyer':
          aVal = a.buyer || "";
          bVal = b.buyer || "";
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const filteredItems = items.filter(it => {
    if ((it.quantity || 0) <= 0) return false;
    const dayMatch = !filterDay || it.circles?.day === filterDay;
    const areaMatch = !filterArea || it.circles?.area === filterArea;
    const priorityMatch = filterPriority.length === 0 || filterPriority.includes(it.priority);
    const tagMatch = filterTags.length === 0 || filterTags.some(t => it.tags?.includes(t));
    const searchMatch = !searchQuery ||
      it.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.circles?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.circles?.artist?.toLowerCase().includes(searchQuery.toLowerCase());

    const buyerMatch = !filterBuyer ||
      (filterBuyer === "None" && (!it.item_buyers || it.item_buyers.length === 0) && !it.buyer) ||
      (it.item_buyers?.some((ib: any) => ib.buyers?.name === filterBuyer)) ||
      (it.buyer === filterBuyer);

    return dayMatch && areaMatch && priorityMatch && tagMatch && searchMatch && buyerMatch;
  });

  const sortedItems = getSortedItems(filteredItems);

  const totalPrice = filteredItems.reduce((sum, it) => sum + (it.price || 0), 0);
  const purchasedPrice = filteredItems.reduce((sum, it) => sum + (it.is_purchased ? it.price || 0 : 0), 0);
  const totalCount = filteredItems.length;
  const purchasedCount = filteredItems.filter(it => it.is_purchased).length;


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

      {/* Fixed SubHeader for Controls - Only for Feed and List */}
      {(activeTab === "feed" || activeTab === "list") && (
        <div className={styles.subHeader}>
          {activeTab === "feed" && (
            <div className={styles.feedSearchWrapper}>
              <div className={styles.searchBox}>
                <Search size={18} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search artist, circle, or content..."
                  value={feedSearch}
                  onChange={(e) => setFeedSearch(e.target.value)}
                />
              </div>
              <div className={styles.viewToggle}>
                <button
                  className={`${styles.toggleBtn} ${viewMode === 'grid' ? styles.active : ''}`}
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid size={18} />
                </button>
                <button
                  className={`${styles.toggleBtn} ${viewMode === 'list' ? styles.active : ''}`}
                  onClick={() => setViewMode('list')}
                >
                  <LayoutList size={18} />
                </button>
              </div>
            </div>
          )}

          {activeTab === "list" && (
            <div className={styles.shoppingHeaderWrapper}>
              <div className={styles.searchBarRow}>
                <div className={styles.searchBox}>
                  <Search size={18} className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search items, circles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  className={`${styles.filterBtn} ${filterDay || filterArea || filterPriority.length > 0 || filterTags.length > 0 || filterBuyer ? styles.hasFilters : ""}`}
                  onClick={() => setIsFilterModalOpen(true)}
                >
                  <Filter size={20} />
                  {(filterDay || filterArea || filterPriority.length > 0 || filterTags.length > 0 || filterBuyer) && <span className={styles.filterDot} />}
                </button>
              </div>

              <ShoppingStats
                purchasedPrice={purchasedPrice}
                totalPrice={totalPrice}
                purchasedCount={purchasedCount}
                totalCount={totalCount}
              />
            </div>
          )}
        </div>
      )}

      <ShoppingListFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterDay={filterDay}
        setFilterDay={setFilterDay}
        filterArea={filterArea}
        setFilterArea={setFilterArea}
        filterPriority={filterPriority}
        togglePriorityFilter={togglePriorityFilter}
        clearPriorityFilter={clearPriorityFilter}
        filterTags={filterTags}
        toggleTagFilter={toggleTagFilter}
        clearTagFilter={clearTagFilter}
        dbBuyers={dbBuyers}
        filterBuyer={filterBuyer}
        setFilterBuyer={setFilterBuyer}
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
                items={sortedItems}
                dbBuyers={dbBuyers}
                sortConfig={sortConfig}
                onSort={(key: string) => {
                  let direction: 'asc' | 'desc' = 'asc';
                  if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
                    direction = 'desc';
                  }
                  setSortConfig({ key, direction });
                }}
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
            <div className={styles.mapPlaceholderWrapper}>
              <div className={styles.emptyState}>
                <div className={`${styles.emptyIcon} glass`}>
                  <MapPin size={48} className={styles.mutedIcon} />
                </div>
                <h2>Map View</h2>
                <p>Circle location visualization coming soon...</p>
              </div>
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
