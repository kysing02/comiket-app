"use client";

import React from "react";
import { X, Search, Filter, MapPin } from "lucide-react";
import styles from "./ShoppingListFilterModal.module.css";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

interface ShoppingListFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
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

export const ShoppingListFilterModal: React.FC<ShoppingListFilterModalProps> = ({
    isOpen,
    onClose,
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
    if (typeof document === "undefined") return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={styles.overlay}
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className={styles.modal}
                    >
                        <div className={styles.header}>
                            <h3>Filter Items</h3>
                            <button className={styles.closeBtn} onClick={onClose}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className={styles.content}>
                            {/* Search Box */}
                            <div className={styles.section}>
                                <label className={styles.sectionLabel}>Search</label>
                                <div className={styles.searchBox}>
                                    <Search size={18} className={styles.searchIcon} />
                                    <input
                                        type="text"
                                        placeholder="Search products, circles..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Filters */}
                            <div className={styles.section}>
                                <label className={styles.sectionLabel}><Filter size={14} /> Day</label>
                                <div className={styles.filterRow}>
                                    <button className={`${styles.pill} ${!filterDay ? styles.active : ""}`} onClick={() => setFilterDay(null)}>All</button>
                                    <button className={`${styles.pill} ${filterDay === "1" ? styles.active : ""}`} onClick={() => setFilterDay("1")}>Day 1</button>
                                    <button className={`${styles.pill} ${filterDay === "2" ? styles.active : ""}`} onClick={() => setFilterDay("2")}>Day 2</button>
                                </div>
                            </div>

                            <div className={styles.section}>
                                <label className={styles.sectionLabel}><MapPin size={14} /> Area</label>
                                <div className={styles.filterRow}>
                                    <button className={`${styles.pill} ${!filterArea ? styles.active : ""}`} onClick={() => setFilterArea(null)}>All</button>
                                    <button className={`${styles.pill} ${filterArea === "東" ? styles.active : ""}`} onClick={() => setFilterArea("東")}>東 (East)</button>
                                    <button className={`${styles.pill} ${filterArea === "西" ? styles.active : ""}`} onClick={() => setFilterArea("西")}>西 (West)</button>
                                </div>
                            </div>

                            <div className={styles.section}>
                                <label className={styles.sectionLabel}>Priority</label>
                                <div className={styles.filterRow}>
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
                            </div>

                            <div className={styles.section}>
                                <label className={styles.sectionLabel}>Tags</label>
                                <div className={styles.filterRow}>
                                    <button className={`${styles.pill} ${filterTags.length === 0 ? styles.active : ""}`} onClick={clearTagFilter}>All</button>
                                    <div className={styles.tagGrid}>
                                        {['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#6b7280'].map(c => (
                                            <div
                                                key={c}
                                                className={`${styles.colorPill} ${filterTags.includes(c) ? styles.active : ""}`}
                                                style={{ backgroundColor: c }}
                                                onClick={() => toggleTagFilter(c)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className={styles.section}>
                                <label className={styles.sectionLabel}>Person</label>
                                <div className={styles.filterRow}>
                                    <button className={`${styles.pill} ${!filterBuyer ? styles.active : ""}`} onClick={() => setFilterBuyer(null)}>All</button>
                                    <button
                                        className={`${styles.pill} ${filterBuyer === "None" ? styles.active : ""}`}
                                        onClick={() => setFilterBuyer("None")}
                                    >
                                        None
                                    </button>
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
                        </div>

                        <div className={styles.footer}>
                            <button className={styles.applyBtn} onClick={onClose}>Apply Filters</button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};
