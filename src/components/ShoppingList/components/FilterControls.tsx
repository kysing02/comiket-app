import React from "react";
import { Search, Filter, MapPin } from "lucide-react";
import styles from "../../ShoppingList.module.css";

interface FilterControlsProps {
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    filterDay: string | null;
    setFilterDay: (val: string | null) => void;
    filterArea: string | null;
    setFilterArea: (val: string | null) => void;
    filterPriority: string[];
    togglePriorityFilter: (priority: string) => void;
    clearPriorityFilter: () => void;
    filterTags: string[];
    toggleTagFilter: (color: string) => void;
    clearTagFilter: () => void;
    dbBuyers: any[];
    filterBuyer: string | null;
    setFilterBuyer: (val: string | null) => void;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
    searchQuery,
    setSearchQuery,
    filterDay,
    setFilterDay,
    filterArea,
    setFilterArea,
    filterPriority,
    togglePriorityFilter,
    clearPriorityFilter,
    filterTags,
    toggleTagFilter,
    clearTagFilter,
    dbBuyers,
    filterBuyer,
    setFilterBuyer,
}) => {
    return (
        <>
            {/* Search Box */}
            <div className={styles.searchWrapper}>
                <div className={styles.searchBox}>
                    <Search size={16} className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search items, circles, or artists..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="glass"
                    />
                </div>
            </div>

            {/* Filter Controls */}
            <div className={styles.controls}>
                <div className={styles.filterRow}>
                    <span className={styles.filterLabel}><Filter size={12} /> Day:</span>
                    <button className={`${styles.pill} ${!filterDay ? styles.active : ""}`} onClick={() => setFilterDay(null)}>All</button>
                    <button className={`${styles.pill} ${filterDay === "1" ? styles.active : ""}`} onClick={() => setFilterDay("1")}>Day 1</button>
                    <button className={`${styles.pill} ${filterDay === "2" ? styles.active : ""}`} onClick={() => setFilterDay("2")}>Day 2</button>
                </div>
                <div className={styles.filterRow}>
                    <span className={styles.filterLabel}><MapPin size={12} /> Area:</span>
                    <button className={`${styles.pill} ${!filterArea ? styles.active : ""}`} onClick={() => setFilterArea(null)}>All</button>
                    <button className={`${styles.pill} ${filterArea === "東" ? styles.active : ""}`} onClick={() => setFilterArea("東")}>東 (East)</button>
                    <button className={`${styles.pill} ${filterArea === "西" ? styles.active : ""}`} onClick={() => setFilterArea("西")}>西 (West)</button>
                </div>
                <div className={styles.filterRow}>
                    <span className={styles.filterLabel}>Priority:</span>
                    <button className={`${styles.pill} ${filterPriority.length === 0 ? styles.active : ""}`} onClick={clearPriorityFilter}>All</button>
                    {["High", "Medium", "Low"].map(p => (
                        <button
                            key={p}
                            className={`${styles.pill} ${filterPriority.includes(p) ? styles.active : ""}`}
                            onClick={() => togglePriorityFilter(p)}
                        >
                            {p}
                        </button>
                    ))}
                </div>
                <div className={styles.filterRow}>
                    <span className={styles.filterLabel}>Tag:</span>
                    <button className={`${styles.pill} ${filterTags.length === 0 ? styles.active : ""}`} onClick={clearTagFilter}>All</button>
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '4px' }}>
                        {['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#6b7280'].map(c => (
                            <div
                                key={c}
                                className={`${styles.colorPill} ${filterTags.includes(c) ? styles.active : ""}`}
                                style={{ backgroundColor: c, color: c }}
                                onClick={() => toggleTagFilter(c)}
                            />
                        ))}
                    </div>
                </div>
                <div className={styles.filterRow}>
                    <span className={styles.filterLabel}>Person:</span>
                    <button className={`${styles.pill} ${!filterBuyer ? styles.active : ""}`} onClick={() => setFilterBuyer(null)}>All</button>
                    {dbBuyers.map(b => (
                        <button
                            key={b.id}
                            className={`${styles.pill} ${filterBuyer === b.name ? styles.active : ""}`}
                            onClick={() => setFilterBuyer(b.name)}
                        >
                            {b.name}
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
};
