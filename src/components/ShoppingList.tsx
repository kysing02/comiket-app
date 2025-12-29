"use client";

import { useState } from "react";
import { Check, User, MapPin, Image as ImageIcon, Filter, Trash2, Search, Edit2 } from "lucide-react";
import styles from "./ShoppingList.module.css";
import { supabase } from "@/lib/supabase";
import ImageLightbox from "./ImageLightbox";

interface ShoppingListProps {
    items: any[];
    onUpdate: (silent?: boolean) => void;
    onEditCircle: (circle: any, step?: 1 | 2) => void;
}

export default function ShoppingList({ items, onUpdate, onEditCircle }: ShoppingListProps) {
    const [filterDay, setFilterDay] = useState<string | null>(null);
    const [filterArea, setFilterArea] = useState<string | null>(null); // New: Area filter (東, 西)
    const [filterPriority, setFilterPriority] = useState<string[]>([]); // Array for multiple selection
    const [filterTags, setFilterTags] = useState<string[]>([]); // Array of color hexes
    const [searchQuery, setSearchQuery] = useState("");
    // Lightbox State
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxImages, setLightboxImages] = useState<string[]>([]);

    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'circle', direction: 'asc' });

    const [localPurchased, setLocalPurchased] = useState<Record<string, boolean>>({});

    const togglePurchased = async (itemId: string, currentStatus: boolean) => {
        const optimisticStatus = !currentStatus;
        setLocalPurchased(prev => ({ ...prev, [itemId]: optimisticStatus }));

        const { error } = await supabase
            .from("items")
            .update({ is_purchased: optimisticStatus })
            .eq("id", itemId);

        if (error) {
            setLocalPurchased(prev => ({ ...prev, [itemId]: currentStatus }));
            console.error("Failed to update status", error);
        } else {
            onUpdate(true); // Silent refresh
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
                    aVal = `${a.circles?.day || "9"}-${a.circles?.formatted_location || ""}`;
                    bVal = `${b.circles?.day || "9"}-${b.circles?.formatted_location || ""}`;
                    break;
                case 'gojuon': // Sort by 東 あ-わ -> 西 あ-わ -> A-Z
                    const getSortKey = (item: any) => {
                        const areaOrder = item.circles?.area === "東" ? "1" : (item.circles?.area === "西" ? "2" : "3");
                        // localeCompare with 'ja' handles phonetic sorting for Japanese
                        return `${areaOrder}-${item.circles?.name || ""}`;
                    };
                    aVal = getSortKey(a);
                    bVal = getSortKey(b);
                    // Always use localeCompare for strings in gojuon mode
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
        // Show item if it has a multi-buyer assignment OR a legacy buyer string
        const hasNewAssignment = it.item_buyers && it.item_buyers.length > 0;
        const hasLegacyAssignment = it.buyer && it.buyer.trim() !== "";
        const hasBuyerAssignment = hasNewAssignment || hasLegacyAssignment;

        if (!hasBuyerAssignment) return false;

        if ((it.quantity || 0) <= 0) return false; // Hide 0 qty items
        const dayMatch = !filterDay || it.circles?.day === filterDay;
        const areaMatch = !filterArea || it.circles?.area === filterArea;
        const priorityMatch = filterPriority.length === 0 || filterPriority.includes(it.priority);
        const tagMatch = filterTags.length === 0 || filterTags.some(t => it.tags?.includes(t));
        const searchMatch = !searchQuery ||
            it.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            it.circles?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            it.circles?.artist?.toLowerCase().includes(searchQuery.toLowerCase());
        return dayMatch && areaMatch && priorityMatch && tagMatch && searchMatch;
    });

    const sortedItems = getSortedItems(filteredItems);

    const totalPrice = filteredItems.reduce((sum, it) => sum + (it.price || 0), 0);
    const purchasedPrice = filteredItems.reduce((sum, it) => sum + (it.is_purchased ? it.price || 0 : 0), 0);
    const totalCount = filteredItems.length;
    const purchasedCount = filteredItems.filter(it => it.is_purchased).length;


    const openLightbox = (itemImg?: string, circleImgs?: string[], mapUrl?: string) => {
        let imagesToView: string[] = [];

        // 1. Item-specific image
        if (itemImg) imagesToView.push(itemImg);

        // 2. Circle image gallery
        if (Array.isArray(circleImgs)) {
            circleImgs.forEach(url => {
                if (url && !imagesToView.includes(url)) imagesToView.push(url);
            });
        }

        // 3. Map URL
        if (mapUrl && !imagesToView.includes(mapUrl)) {
            imagesToView.push(mapUrl);
        }

        if (imagesToView.length > 0) {
            setLightboxImages(imagesToView);
            setLightboxOpen(true);
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Remove "${name}" from Shopping List? (Sets quantity to 0)`)) return;

        // Optimistic update would be nice, but silent refresh is also fine as requested
        const { error } = await supabase.from("items").update({ quantity: 0 }).eq("id", id);
        if (error) {
            console.error("Failed to update item", error);
        } else {
            onUpdate(true); // Silent refresh
        }
    };

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig?.key !== column) return <span className={styles.sortPlaceholder} />;
        return <span className={styles.sortIcon}>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
    };

    return (
        <div className={styles.container}>
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
            </div>

            {/* Table Container for Scroll */}
            <div className={styles.tableScroll}>
                {/* Table Header */}
                <div className={styles.tableHeader}>
                    <div className={`${styles.colStatus} ${styles.sortable}`} onClick={() => handleSort('status')}>
                        Done <SortIcon column="status" />
                    </div>
                    <div className={`${styles.colInfo} ${styles.sortable}`} onClick={() => handleSort('gojuon')}>
                        Circle / Item <SortIcon column="gojuon" />
                    </div>
                    <div className={styles.colAction}>Img</div>
                </div>

                {/* Table Rows */}
                <div className={styles.list}>
                    {sortedItems.map((item) => (
                        <div
                            key={item.id}
                            className={`${styles.tableRow} ${item.is_purchased ? styles.purchasedRow : ""} glass-card`}
                            onClick={(e) => {
                                // Don't trigger if clicked on checkbox, image button, or delete button
                                const target = e.target as HTMLElement;
                                if (target.closest(`.${styles.checkbox}`) ||
                                    target.closest(`.${styles.imgBtn}`) ||
                                    target.closest(`.${styles.deleteBtn}`)) {
                                    return;
                                }
                                if (item.image_url || item.circles?.image_urls || item.circles?.map_url) {
                                    openLightbox(item.image_url, item.circles?.image_urls, item.circles?.map_url);
                                }
                            }}
                        >
                            {/* 1. Status Checkbox */}
                            <div className={styles.colStatus}>
                                <button
                                    className={`${styles.checkbox} ${(localPurchased[item.id] ?? item.is_purchased) ? styles.checked : ""}`}
                                    onClick={() => togglePurchased(item.id, localPurchased[item.id] ?? item.is_purchased)}
                                >
                                    {(localPurchased[item.id] ?? item.is_purchased) && <Check size={16} />}
                                </button>
                            </div>

                            {/* 2. Main Info (Circle & Item) */}
                            <div className={styles.colInfo}>
                                <div className={styles.circleLine}>
                                    <span className={styles.locationBadge}>
                                        {item.circles?.formatted_location || `${item.circles?.area}${item.circles?.block}-${item.circles?.space_number}`}
                                    </span>
                                    <span className={styles.circleName}>{item.circles?.name}</span>
                                    <span className={styles.artistName}>@{item.circles?.artist}</span>
                                </div>
                                <div className={styles.itemLine}>
                                    <div className={styles.itemMainInfo}>
                                        <span className={styles.itemName}>{item.name}</span>
                                        <div className={styles.tagContainer}>
                                            {item.tags?.map((color: string, idx: number) => (
                                                <span key={idx} className={styles.tagDot} style={{ backgroundColor: color }} />
                                            ))}
                                        </div>
                                    </div>

                                    <div className={styles.itemMetadata}>
                                        <div className={styles.metadataGroup}>
                                            <span className={styles.itemPrice}>¥{item.price?.toLocaleString()}</span>
                                            <button
                                                className={styles.editBtn}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEditCircle(item.circles, 2);
                                                }}
                                                title="Edit Circle/Items"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                        </div>

                                        <div className={styles.metadataGroup}>
                                            <span className={styles.mobileQty}>x{item.quantity || 1}</span>
                                            <span className={`${styles.mobilePriority} ${styles[item.priority?.toLowerCase()]}`}>
                                                {item.priority?.substring(0, 3) || "Mid"}
                                            </span>
                                            {(item.buyer || item.item_buyers?.length > 0) && (
                                                <div className={styles.mobileBuyerContainer}>
                                                    {item.item_buyers?.length > 0 ? (
                                                        // Deduplicate by name to prevent "シ and シ" if same name exists twice
                                                        Array.from(new Map(
                                                            item.item_buyers
                                                                .filter((ib: any) => ib.buyers?.name)
                                                                .map((ib: any) => [ib.buyers.name, ib])
                                                        ).values()).map((ib: any, idx: number) => (
                                                            <div key={idx} className={styles.mobileBuyer} title={ib.buyers.name}>
                                                                {ib.buyers.name.substring(0, 1) || "?"}
                                                            </div>
                                                        ))
                                                    ) : item.buyer ? (
                                                        /* Fallback for un-migrated items */
                                                        <div className={styles.mobileBuyer} title={item.buyer}>
                                                            {item.buyer.substring(0, 1)}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 5. Image & Delete Action */}
                            <div className={styles.colAction}>
                                {item.image_url ? (
                                    <button className={styles.imgBtn} onClick={() => openLightbox(item.image_url, item.circles?.image_urls, item.circles?.map_url)}>
                                        <ImageIcon size={18} />
                                    </button>
                                ) : (
                                    <span className={styles.noImg}></span>
                                )}
                                <button className={styles.deleteBtn} onClick={() => handleDelete(item.id, item.name)}>
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
                imageUrls={lightboxImages}
                onClose={() => setLightboxOpen(false)}
            />
        </div>
    );
}
