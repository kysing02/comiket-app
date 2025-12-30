"use client";

import { useState, useRef, useEffect } from "react";
import { ShoppingBag, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";

import ShoppingList from "@/components/ShoppingList";
import AddItemModal from "@/components/AddItemModal";
import { Header } from "./components/Header";
import { BottomNav } from "./components/BottomNav";
import { FeedTab } from "./components/FeedTab";
import { SettingsTab } from "./components/SettingsTab";
import { ShoppingListFilterModal } from "@/components/ShoppingList/components/ShoppingListFilterModal";
import { FeedFilterModal } from "./components/FeedFilterModal";
import { SubHeader } from "./components/SubHeader";
import { LogViewer } from "@/components/LogViewer";
import { logger } from "@/lib/logger";

import { useAppInitialization } from "@/hooks/useAppInitialization";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useShoppingFilters } from "@/hooks/useShoppingFilters";

export default function Home() {
  useEffect(() => {
    logger.app("Comiket App Initialized");
  }, []);

  const {
    activeTab,
    setActiveTab,
    appSettings,
    updateSetting,
    deferredPrompt,
    isOffline,
    handleInstallClick
  } = useAppInitialization();

  const {
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
  } = useSupabaseData();

  const {
    filterDay, setFilterDay,
    filterArea, setFilterArea,
    filterPriority, togglePriorityFilter, clearPriorityFilter,
    filterTags, toggleTagFilter, clearTagFilter,
    searchQuery, setSearchQuery,
    filterBuyer, setFilterBuyer,
    sortConfig, setSortConfig,
    resetFilters,
    sortedItems,
    purchasedPrice, totalPrice, purchasedCount, totalCount
  } = useShoppingFilters(items);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCircle, setEditingCircle] = useState<any>(null);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [feedSearch, setFeedSearch] = useState("");
  const [feedFilterDay, setFeedFilterDay] = useState<string | null>(null);
  const [feedFilterArea, setFeedFilterArea] = useState<string | null>(null);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [favoriteCircleIds, setFavoriteCircleIds] = useState<string[]>([]);
  const [isFeedFilterModalOpen, setIsFeedFilterModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Load favorites from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("favorite_circles");
    if (saved) {
      try {
        setFavoriteCircleIds(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse favorites", e);
      }
    }
  }, []);

  // Save favorites to localStorage when they change
  useEffect(() => {
    localStorage.setItem("favorite_circles", JSON.stringify(favoriteCircleIds));
  }, [favoriteCircleIds]);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll Persistence
  const prevHasFiltersRef = useRef<Record<string, boolean>>({ feed: false, list: false });
  const isRestoringRef = useRef(false);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const hasFeedFilters = !!(feedSearch || feedFilterDay || feedFilterArea || filterFavorites);
    const hasListFilters = !!(searchQuery || filterDay || filterArea || filterPriority.length > 0 || filterTags.length > 0 || filterBuyer);
    const currentHasFilters = activeTab === "feed" ? hasFeedFilters : (activeTab === "list" ? hasListFilters : false);

    const handleScroll = () => {
      if (isRestoringRef.current) return;

      const positions = JSON.parse(localStorage.getItem("scrollPositions") || "{}");
      positions[activeTab] = container.scrollTop;
      localStorage.setItem("scrollPositions", JSON.stringify(positions));

      // If NOT filtered, also save as "base" position
      if (!currentHasFilters) {
        const basePositions = JSON.parse(localStorage.getItem("baseScrollPositions") || "{}");
        basePositions[activeTab] = container.scrollTop;
        localStorage.setItem("baseScrollPositions", JSON.stringify(basePositions));
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [activeTab, feedSearch, feedFilterDay, feedFilterArea, filterFavorites, searchQuery, filterDay, filterArea, filterPriority, filterTags, filterBuyer]);

  // Handle restoration on tab change or filter clear
  useEffect(() => {
    const hasFeedFilters = !!(feedSearch || feedFilterDay || feedFilterArea || filterFavorites);
    const hasListFilters = !!(searchQuery || filterDay || filterArea || filterPriority.length > 0 || filterTags.length > 0 || filterBuyer);

    const prevHasFilters = prevHasFiltersRef.current[activeTab];
    const currentHasFilters = activeTab === "feed" ? hasFeedFilters : (activeTab === "list" ? hasListFilters : false);

    if (scrollRef.current) {
      if (prevHasFilters && !currentHasFilters) {
        // Filters were cleared, restore base position
        const basePositions = JSON.parse(localStorage.getItem("baseScrollPositions") || "{}");
        const targetPos = basePositions[activeTab] || 0;

        isRestoringRef.current = true;
        scrollRef.current.scrollTop = targetPos;
        setTimeout(() => { isRestoringRef.current = false; }, 100);
      } else if (!prevHasFilters && currentHasFilters) {
        // Filters were applied, scroll to top to show results
        scrollRef.current.scrollTop = 0;
      }
    }

    prevHasFiltersRef.current[activeTab] = currentHasFilters;
  }, [activeTab, feedSearch, feedFilterDay, feedFilterArea, filterFavorites, searchQuery, filterDay, filterArea, filterPriority, filterTags, filterBuyer]);

  // Initial load or Tab change restoration
  useEffect(() => {
    if (loading) return;

    const savedScrolls = localStorage.getItem("scrollPositions");
    if (savedScrolls && scrollRef.current) {
      try {
        const positions = JSON.parse(savedScrolls);
        if (positions[activeTab] !== undefined) {
          isRestoringRef.current = true;
          setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = positions[activeTab];
            setTimeout(() => { isRestoringRef.current = false; }, 100);
          }, 50);
        } else {
          scrollRef.current.scrollTop = 0;
        }
      } catch (e) { }
    }
  }, [activeTab, loading]);

  const handleTabClick = (tab: string) => {
    if (activeTab === tab) {
      if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setActiveTab(tab);
    }
  };

  const handleImportPost = (post: any) => {
    setEditingCircle({
      name: "",
      artist: "",
      x_url: post.url,
      map_url: post.image_urls?.[0] || "",
      image_urls: post.image_urls || [],
      scrapedContent: post.content,
      scraped_id: post.id,
      username: post.username,
      extraction_status: post.extraction_status,
      extracted_data: post.extracted_data
    });
    setIsModalOpen(true);
  };

  // Merge live scraped post data if we're editing an imported post
  const activeInitialData = (() => {
    if (!editingCircle?.scraped_id) return editingCircle;
    const post = scrapedPosts.find(p => p.id === editingCircle.scraped_id);
    if (!post) return editingCircle;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _, ...postData } = post;
    return { ...editingCircle, ...postData };
  })();

  return (
    <div className={styles.dashboard}>
      <Header
        isOffline={isOffline}
        deferredPrompt={deferredPrompt}
        handleInstallClick={handleInstallClick}
        onOpenSettings={() => setActiveTab("settings")}
      />

      <SubHeader
        activeTab={activeTab}
        feedSearch={feedSearch}
        setFeedSearch={setFeedSearch}
        viewMode={viewMode}
        setViewMode={setViewMode}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isFilterModalOpen={isFilterModalOpen}
        setIsFilterModalOpen={setIsFilterModalOpen}
        isFeedFilterModalOpen={isFeedFilterModalOpen}
        setIsFeedFilterModalOpen={setIsFeedFilterModalOpen}
        hasFilters={!!(filterDay || filterArea || filterPriority.length > 0 || filterTags.length > 0 || filterBuyer)}
        hasFeedFilters={!!(feedFilterDay || feedFilterArea || filterFavorites)}
        stats={{ purchasedPrice, totalPrice, purchasedCount, totalCount }}
        onSort={(key: string) => {
          let direction: 'asc' | 'desc' = 'asc';
          if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
          setSortConfig({ key, direction });
        }}
        sortConfig={sortConfig}
        onClearFilters={resetFilters}
        aiPaused={aiPaused}
        onToggleAi={toggleAiExtraction}
      />

      <FeedFilterModal
        isOpen={isFeedFilterModalOpen}
        onClose={() => setIsFeedFilterModalOpen(false)}
        filterDay={feedFilterDay}
        setFilterDay={setFeedFilterDay}
        filterArea={feedFilterArea}
        setFilterArea={setFeedFilterArea}
        filterFavorites={filterFavorites}
        setFilterFavorites={setFilterFavorites}
      />

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
                  if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
                  setSortConfig({ key, direction });
                }}
                onClearFilters={resetFilters}
                onUpdate={(silent = false) => {
                  fetchItems(silent);
                  fetchCircles(silent);
                }}
                onEditCircle={(circle, step) => {
                  setEditingCircle(circles.find(c => c.id === circle.id) || circle);
                  setModalStep(step || 1);
                  setIsModalOpen(true);
                }}
              />
            ) : (
              <div className={styles.emptyState}>
                <div className={`${styles.emptyIcon} glass`}><ShoppingBag size={48} className={styles.mutedIcon} /></div>
                <h2>No items yet</h2>
                <p>Select items to buy from the feed</p>
                <button className={styles.primaryBtn} onClick={() => { setEditingCircle(null); setIsModalOpen(true); }}>Add Item Manually</button>
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
                <div className={`${styles.emptyIcon} glass`}><MapPin size={48} className={styles.mutedIcon} /></div>
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
              circles={circles.map(c => ({
                ...c,
                is_favorite: favoriteCircleIds.includes(c.id)
              }))}
              onEditCircle={(circle, step) => {
                setEditingCircle(circle);
                setModalStep(step || 1);
                setIsModalOpen(true);
              }}
              onDeleteCircle={handleDeleteCircle}
              onToggleFavorite={(id) => {
                setFavoriteCircleIds(prev =>
                  prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
                );
              }}
              filterDay={feedFilterDay}
              filterArea={feedFilterArea}
              filterFavorites={filterFavorites}
              aiPaused={aiPaused}
            />
          )}
        </section>
      </div>

      <BottomNav
        activeTab={activeTab}
        onTabClick={handleTabClick}
        onAddClick={() => { setEditingCircle(null); setIsModalOpen(true); }}
      />

      <AddItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={activeInitialData}
        initialStep={modalStep}
        dbBuyers={dbBuyers}
        globalSettings={appSettings}
        onSuccess={() => {
          fetchItems(true);
          fetchCircles(true);
          fetchScrapedPosts(true);
        }}
      />

      <LogViewer />
    </div>
  );
}
