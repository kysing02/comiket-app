"use client";

import { useState } from "react";
import { Check, User, MapPin, Image as ImageIcon, Filter, Trash2 } from "lucide-react";
import styles from "./ShoppingList.module.css";
import { supabase } from "@/lib/supabase";
import ImageLightbox from "./ImageLightbox";

interface ShoppingListProps {
    items: any[];
    onUpdate: () => void;
}

export default function ShoppingList({ items, onUpdate }: ShoppingListProps) {
    const [filterDay, setFilterDay] = useState<string | null>(null);
    const [filterPriority, setFilterPriority] = useState<string[]>([]); // Array for multiple selection
    // Lightbox State
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxSrc, setLightboxSrc] = useState("");

    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    const togglePurchased = async (itemId: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from("items")
            .update({ is_purchased: !currentStatus })
            .eq("id", itemId);

        if (!error) onUpdate();
    };

    const togglePriorityFilter = (priority: string) => {
        if (filterPriority.includes(priority)) {
            setFilterPriority(filterPriority.filter(p => p !== priority));
        } else {
            setFilterPriority([...filterPriority, priority]);
        }
    };

    const clearPriorityFilter = () => setFilterPriority([]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

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
                    aVal = `${a.circles?.day}-${a.circles?.area}-${a.circles?.block}-${a.circles?.space_number}`;
                    bVal = `${b.circles?.day}-${b.circles?.area}-${b.circles?.block}-${b.circles?.space_number}`;
                    break;
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
        const dayMatch = !filterDay || it.circles?.day === filterDay;
        const priorityMatch = filterPriority.length === 0 || filterPriority.includes(it.priority);
        return dayMatch && priorityMatch;
    });

    const sortedItems = getSortedItems(filteredItems);

    const totalPrice = filteredItems.reduce((sum, it) => sum + (it.price || 0), 0);
    const purchasedPrice = filteredItems.reduce((sum, it) => sum + (it.is_purchased ? it.price || 0 : 0), 0);
    const totalCount = filteredItems.length;
    const purchasedCount = filteredItems.filter(it => it.is_purchased).length;


    const openLightbox = (image: string) => {
        if (!image) return;
        setLightboxSrc(image);
        setLightboxOpen(true);
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this item?")) return;
        const { error } = await supabase.from("items").delete().eq("id", id);
        if (error) {
            console.error("Failed to delete item", error);
        } else {
            onUpdate();
        }
    };

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig?.key !== column) return <span className={styles.sortPlaceholder} />;
        return <span className={styles.sortIcon}>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
    };

    return (
        <div className={styles.container}>
            {/* Stats Bar */}
            <div className={`${styles.stats} glass-card`}>
                <div className={styles.statGroup}>
                    <div className={styles.statLabel}>Budget Used</div>
                    <div className={styles.statValue}>
                        ¥{purchasedPrice.toLocaleString()} <span className={styles.statTotal}>/ ¥{totalPrice.toLocaleString()}</span>
                    </div>
                </div>
                <div className={styles.statGroup}>
                    <div className={styles.statLabel}>Progress</div>
                    <div className={styles.statValue}>
                        {purchasedCount} <span className={styles.statTotal}>/ {totalCount} items</span>
                    </div>
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
            </div>

            {/* Table Container for Scroll */}
            <div className={styles.tableScroll}>
                {/* Table Header */}
                <div className={styles.tableHeader}>
                    <div className={`${styles.colStatus} ${styles.sortable}`} onClick={() => handleSort('status')}>
                        Done <SortIcon column="status" />
                    </div>
                    <div className={`${styles.colInfo} ${styles.sortable}`} onClick={() => handleSort('circle')}>
                        Circle / Item <SortIcon column="circle" />
                    </div>
                    <div className={`${styles.colMeta} ${styles.sortable}`} onClick={() => handleSort('priority')}>
                        Meta <SortIcon column="priority" />
                    </div>
                    <div className={`${styles.colBuyer} ${styles.sortable}`} onClick={() => handleSort('buyer')}>
                        Buyer <SortIcon column="buyer" />
                    </div>
                    <div className={styles.colAction}>Img</div>
                </div>

                {/* Table Rows */}
                <div className={styles.list}>
                    {sortedItems.map((item) => (
                        <div key={item.id} className={`${styles.tableRow} ${item.is_purchased ? styles.purchasedRow : ""} glass-card`}>
                            {/* 1. Status Checkbox */}
                            <div className={styles.colStatus}>
                                <button
                                    className={`${styles.checkbox} ${item.is_purchased ? styles.checked : ""}`}
                                    onClick={() => togglePurchased(item.id, item.is_purchased)}
                                >
                                    {item.is_purchased && <Check size={16} />}
                                </button>
                            </div>

                            {/* 2. Main Info (Circle & Item) */}
                            <div className={styles.colInfo}>
                                <div className={styles.circleLine}>
                                    <span className={styles.locationBadge}>
                                        {item.circles?.area}{item.circles?.block}-{item.circles?.space_number}
                                    </span>
                                    <span className={styles.circleName}>{item.circles?.name}</span>
                                    <span className={styles.artistName}>@{item.circles?.artist}</span>
                                </div>
                                <div className={styles.itemLine}>
                                    <span className={styles.itemName}>{item.name}</span>
                                    <span className={styles.itemPrice}>¥{item.price?.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* 3. Meta (Qty & Priority) */}
                            <div className={styles.colMeta}>
                                <div className={styles.qtyBadge}>x{item.quantity || 1}</div>
                                <div className={`${styles.priorityBadge} ${styles[item.priority?.toLowerCase()]}`}>
                                    {item.priority?.substring(0, 3) || "Mid"}
                                </div>
                            </div>

                            {/* 4. Buyer */}
                            <div className={styles.colBuyer}>
                                {item.buyer ? (
                                    <span className={styles.buyerTag}>{item.buyer.substring(0, 2)}</span>
                                ) : (
                                    <span className={styles.buyerEmpty}>--</span>
                                )}
                            </div>

                            {/* 5. Image & Delete Action */}
                            <div className={styles.colAction}>
                                {item.image_url ? (
                                    <button className={styles.imgBtn} onClick={() => openLightbox(item.image_url)}>
                                        <ImageIcon size={18} />
                                    </button>
                                ) : (
                                    <span className={styles.noImg}></span>
                                )}
                                <button className={styles.deleteBtn} onClick={() => handleDelete(item.id)}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}

                    {filteredItems.length === 0 && (
                        <div className={styles.emptyState}>
                            <p>No items found matching filters.</p>
                        </div>
                    )}
                </div>
            </div>

            <ImageLightbox
                isOpen={lightboxOpen}
                imageUrl={lightboxSrc}
                onClose={() => setLightboxOpen(false)}
            />
        </div>
    );
}
