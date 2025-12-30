"use client";

import { useState, useRef, useEffect } from "react";
import { ShoppingBag, MapPin } from "lucide-react";
import styles from "./page.module.css";

import ShoppingList from "@/components/ShoppingList";
import AddItemModal from "@/components/AddItemModal";
import { Header } from "./components/Header";
import { BottomNav } from "./components/BottomNav";
import { FeedTab } from "./components/FeedTab";
import { SettingsTab } from "./components/SettingsTab";
import { ShoppingListFilterModal } from "@/components/ShoppingList/components/ShoppingListFilterModal";
import { SubHeader } from "./components/SubHeader";

import { useAppInitialization } from "@/hooks/useAppInitialization";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useShoppingFilters } from "@/hooks/useShoppingFilters";

export default function Home() {
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
    handleMarkAsRead,
    addBuyer,
    removeBuyer,
    updateBuyerName,
    handleDeleteCircle
  } = useSupabaseData();

  const {
    filterDay, setFilterDay,
    filterArea, setFilterArea,
    filterPriority, togglePriorityFilter, clearPriorityFilter,
    filterTags, toggleTagFilter, clearTagFilter,
    searchQuery, setSearchQuery,
    filterBuyer, setFilterBuyer,
    sortConfig, setSortConfig,
    sortedItems,
    purchasedPrice, totalPrice, purchasedCount, totalCount
  } = useShoppingFilters(items);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCircle, setEditingCircle] = useState<any>(null);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [feedSearch, setFeedSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll Persistence
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

  useEffect(() => {
    const savedScrolls = localStorage.getItem("scrollPositions");
    if (savedScrolls && scrollRef.current) {
      try {
        const positions = JSON.parse(savedScrolls);
        if (positions[activeTab] !== undefined) {
          setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = positions[activeTab];
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
      username: post.username
    });
    setIsModalOpen(true);
  };

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
        hasFilters={!!(filterDay || filterArea || filterPriority.length > 0 || filterTags.length > 0 || filterBuyer)}
        stats={{ purchasedPrice, totalPrice, purchasedCount, totalCount }}
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
        onAddClick={() => { setEditingCircle(null); setIsModalOpen(true); }}
      />

      <AddItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchItems(true);
          fetchCircles(true);
        }}
        initialData={editingCircle}
        initialStep={modalStep}
        dbBuyers={dbBuyers}
        globalSettings={appSettings}
      />
    </div>
  );
}
