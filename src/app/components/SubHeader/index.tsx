"use client";

import { Search, LayoutGrid, LayoutList, Filter } from "lucide-react";
import { ShoppingStats } from "@/components/ShoppingList/components/ShoppingStats";
import styles from "./SubHeader.module.css";

interface SubHeaderProps {
    activeTab: string;
    feedSearch: string;
    setFeedSearch: (val: string) => void;
    viewMode: "grid" | "list";
    setViewMode: (mode: "grid" | "list") => void;
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    isFilterModalOpen: boolean;
    setIsFilterModalOpen: (open: boolean) => void;
    isFeedFilterModalOpen: boolean;
    setIsFeedFilterModalOpen: (open: boolean) => void;
    hasFilters: boolean;
    hasFeedFilters: boolean;
    stats: {
        purchasedPrice: number;
        totalPrice: number;
        purchasedCount: number;
        totalCount: number;
    };
    onSort?: (key: string) => void;
    sortConfig?: { key: string, direction: 'asc' | 'desc' } | null;
    onClearFilters?: () => void;
}

export function SubHeader({
    activeTab,
    feedSearch,
    setFeedSearch,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    setIsFilterModalOpen,
    isFeedFilterModalOpen,
    setIsFeedFilterModalOpen,
    hasFilters,
    hasFeedFilters,
    stats,
    onSort,
    sortConfig,
    onClearFilters
}: SubHeaderProps) {
    if (activeTab !== "feed" && activeTab !== "list") return null;

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig?.key !== column) return <span className={styles.sortPlaceholder} />;
        return <span className={styles.sortIcon}>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
    };

    return (
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
                        <button
                            className={`${styles.filterBtn} ${hasFeedFilters ? styles.hasFilters : ""}`}
                            onClick={() => setIsFeedFilterModalOpen(true)}
                        >
                            <Filter size={20} />
                            {hasFeedFilters && <span className={styles.filterDot} />}
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
                            className={`${styles.filterBtn} ${hasFilters ? styles.hasFilters : ""}`}
                            onClick={() => setIsFilterModalOpen(true)}
                        >
                            <Filter size={20} />
                            {hasFilters && <span className={styles.filterDot} />}
                        </button>
                    </div>

                    <ShoppingStats
                        purchasedPrice={stats.purchasedPrice}
                        totalPrice={stats.totalPrice}
                        purchasedCount={stats.purchasedCount}
                        totalCount={stats.totalCount}
                    />

                    <div className={styles.tableHeader}>
                        <div className={`${styles.colStatus} ${styles.sortable}`} onClick={() => onSort?.('status')}>
                            Done <SortIcon column="status" />
                        </div>
                        <div className={`${styles.colInfo} ${styles.sortable}`} onClick={() => onSort?.('gojuon')}>
                            Circle / Item <SortIcon column="gojuon" />
                        </div>
                        <div className={`${styles.colPrice} ${styles.sortable}`} onClick={() => onSort?.('price')}>
                            Price <SortIcon column="price" />
                        </div>
                        <div className={styles.colClear} onClick={onClearFilters}>
                            CLEAR
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
