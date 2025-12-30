"use client";

import React from "react";
import { X, Filter, MapPin, Heart } from "lucide-react";
import styles from "@/components/ShoppingList/components/ShoppingListFilterModal.module.css";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

interface FeedFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    filterDay: string | null;
    setFilterDay: (val: string | null) => void;
    filterArea: string | null;
    setFilterArea: (val: string | null) => void;
    filterFavorites: boolean;
    setFilterFavorites: (val: boolean) => void;
}

export const FeedFilterModal: React.FC<FeedFilterModalProps> = ({
    isOpen,
    onClose,
    filterDay,
    setFilterDay,
    filterArea,
    setFilterArea,
    filterFavorites,
    setFilterFavorites,
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
                            <h3>Filter Circles</h3>
                            <button className={styles.closeBtn} onClick={onClose}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className={styles.content}>
                            {/* Day Filter */}
                            <div className={styles.section}>
                                <label className={styles.sectionLabel}><Filter size={14} /> Day</label>
                                <div className={styles.filterRow}>
                                    <button className={`${styles.pill} ${!filterDay ? styles.active : ""}`} onClick={() => setFilterDay(null)}>All</button>
                                    <button className={`${styles.pill} ${filterDay === "1" ? styles.active : ""}`} onClick={() => setFilterDay("1")}>Day 1</button>
                                    <button className={`${styles.pill} ${filterDay === "2" ? styles.active : ""}`} onClick={() => setFilterDay("2")}>Day 2</button>
                                    <button className={`${styles.pill} ${filterDay === "3" ? styles.active : ""}`} onClick={() => setFilterDay("3")}>Day 3</button>
                                </div>
                            </div>

                            {/* Area Filter */}
                            <div className={styles.section}>
                                <label className={styles.sectionLabel}><MapPin size={14} /> Area</label>
                                <div className={styles.filterRow}>
                                    <button className={`${styles.pill} ${!filterArea ? styles.active : ""}`} onClick={() => setFilterArea(null)}>All</button>
                                    <button className={`${styles.pill} ${filterArea === "東" ? styles.active : ""}`} onClick={() => setFilterArea("東")}>東 (East)</button>
                                    <button className={`${styles.pill} ${filterArea === "西" ? styles.active : ""}`} onClick={() => setFilterArea("西")}>西 (West)</button>
                                </div>
                            </div>

                            {/* Favorites Filter */}
                            <div className={styles.section}>
                                <label className={styles.sectionLabel}><Heart size={14} /> Favorites</label>
                                <div className={styles.filterRow}>
                                    <button className={`${styles.pill} ${!filterFavorites ? styles.active : ""}`} onClick={() => setFilterFavorites(false)}>All Circles</button>
                                    <button className={`${styles.pill} ${filterFavorites ? styles.active : ""}`} onClick={() => setFilterFavorites(true)}>Favorites Only</button>
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
