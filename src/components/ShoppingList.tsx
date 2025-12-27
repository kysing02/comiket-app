"use client";

import { useState } from "react";
import { Check, User, MapPin, Tag } from "lucide-react";
import styles from "./ShoppingList.module.css";
import { supabase } from "@/lib/supabase";

interface ShoppingListProps {
    items: any[];
    onUpdate: () => void;
}

export default function ShoppingList({ items, onUpdate }: ShoppingListProps) {
    const [filterDay, setFilterDay] = useState<string | null>(null);
    const [filterPriority, setFilterPriority] = useState<string | null>(null);

    const togglePurchased = async (itemId: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from("items")
            .update({ is_purchased: !currentStatus })
            .eq("id", itemId);

        if (!error) onUpdate();
    };

    const filteredItems = items.filter(it => {
        const dayMatch = !filterDay || it.circles?.day === filterDay;
        const priorityMatch = !filterPriority || it.priority === filterPriority;
        return dayMatch && priorityMatch;
    });

    const totalPrice = filteredItems.reduce((sum, it) => sum + (it.price || 0), 0);
    const purchasedPrice = filteredItems.reduce((sum, it) => sum + (it.is_purchased ? it.price || 0 : 0), 0);

    return (
        <div className={styles.container}>
            {/* Summary Stats */}
            <div className={`${styles.stats} glass-card`}>
                <div className={styles.statItem}>
                    <span className={styles.statLabel}>Total Cost</span>
                    <span className={styles.statValue}>¥{totalPrice.toLocaleString()}</span>
                </div>
                <div className={styles.statItem}>
                    <span className={styles.statLabel}>Purchased</span>
                    <span className={styles.statValue}>¥{purchasedPrice.toLocaleString()}</span>
                </div>
            </div>

            {/* Filters */}
            <div className={styles.controls}>
                <div className={styles.filterGroup}>
                    <button
                        className={`${styles.pill} ${!filterDay ? styles.active : ""}`}
                        onClick={() => setFilterDay(null)}
                    >
                        All Days
                    </button>
                    <button
                        className={`${styles.pill} ${filterDay === "1" ? styles.active : ""}`}
                        onClick={() => setFilterDay("1")}
                    >
                        Day 1
                    </button>
                    <button
                        className={`${styles.pill} ${filterDay === "2" ? styles.active : ""}`}
                        onClick={() => setFilterDay("2")}
                    >
                        Day 2
                    </button>
                </div>

                <div className={styles.filterGroup}>
                    {["High", "Medium", "Low"].map(p => (
                        <button
                            key={p}
                            className={`${styles.pill} ${filterPriority === p ? styles.active : ""} ${styles[`filter${p}`]}`}
                            onClick={() => setFilterPriority(filterPriority === p ? null : p)}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.list}>
                {filteredItems.map((item) => (
                    <div key={item.id} className={`${styles.itemCard} glass-card`}>
                        <div className={styles.cardHeader}>
                            <div className={styles.badges}>
                                <span className={`${styles.badge} ${styles.dayBadge}`}>
                                    {item.circles?.day}日目
                                </span>
                                <span className={`${styles.badge} ${styles.priorityBadge} ${styles[item.priority?.toLowerCase() || 'medium']}`}>
                                    {item.priority || "Medium"}
                                </span>
                            </div>
                            <div className={styles.locationInfo}>
                                <MapPin size={14} />
                                {item.circles?.area}{item.circles?.block}-{item.circles?.space_number}
                            </div>
                        </div>

                        <div className={styles.mainInfo}>
                            {item.image_url ? (
                                <img src={item.image_url} alt="お品書き" className={styles.imagePreview} />
                            ) : (
                                <div className={styles.imagePreview} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Tag size={32} className="muted" />
                                </div>
                            )}
                            <div className={styles.details}>
                                <h3 className={styles.circleName}>{item.circles?.name}</h3>
                                <p className={styles.artistName}>@{item.circles?.artist}</p>

                                <div className={styles.goodsList}>
                                    <div className={`${styles.goodEntry} ${item.is_purchased ? styles.purchased : ""}`}>
                                        <span className={styles.goodName}>{item.name}</span>
                                        <span className={styles.goodPrice}>¥{item.price.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.actions}>
                            <div className={styles.buyer}>
                                <User size={12} />
                                <span>{item.buyer || "Me"}</span>
                            </div>
                            <button
                                className={`${styles.checkbox} ${item.is_purchased ? styles.checked : ""}`}
                                onClick={() => togglePurchased(item.id, item.is_purchased)}
                            >
                                {item.is_purchased && <Check size={16} />}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
