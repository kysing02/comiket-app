"use client";

import { useState } from "react";
import { Filter } from "lucide-react";
import styles from "./ShoppingList.module.css";
import { supabase } from "@/lib/supabase";
import ImageLightbox from "./ImageLightbox";
import { ShoppingStats } from "./ShoppingList/components/ShoppingStats";
import { FilterControls } from "./ShoppingList/components/FilterControls";
import { ShoppingItemRow } from "./ShoppingList/components/ShoppingItemRow";

interface ShoppingListProps {
    items: any[];
    onUpdate: (silent?: boolean) => void;
    onEditCircle: (circle: any, step?: 1 | 2) => void;
    dbBuyers: any[];
}

export default function ShoppingList({ items, onUpdate, onEditCircle, dbBuyers }: ShoppingListProps) {
    const [filterDay, setFilterDay] = useState<string | null>(null);
    const [filterArea, setFilterArea] = useState<string | null>(null); // New: Area filter (東, 西)
    const [filterPriority, setFilterPriority] = useState<string[]>([]); // Array for multiple selection
    const [filterTags, setFilterTags] = useState<string[]>([]); // Array of color hexes
    const [searchQuery, setSearchQuery] = useState("");
    const [filterBuyer, setFilterBuyer] = useState<string | null>(null);
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
        if ((it.quantity || 0) <= 0) return false; // Hide 0 qty items
        const dayMatch = !filterDay || it.circles?.day === filterDay;
        const areaMatch = !filterArea || it.circles?.area === filterArea;
        const priorityMatch = filterPriority.length === 0 || filterPriority.includes(it.priority);
        const tagMatch = filterTags.length === 0 || filterTags.some(t => it.tags?.includes(t));
        const searchMatch = !searchQuery ||
            it.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            it.circles?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            it.circles?.artist?.toLowerCase().includes(searchQuery.toLowerCase());

        const buyerMatch = !filterBuyer ||
            (it.item_buyers?.some((ib: any) => ib.buyers?.name === filterBuyer)) ||
            (it.buyer === filterBuyer);

        return dayMatch && areaMatch && priorityMatch && tagMatch && searchMatch && buyerMatch;
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
            <FilterControls
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

            <ShoppingStats
                purchasedPrice={purchasedPrice}
                totalPrice={totalPrice}
                purchasedCount={purchasedCount}
                totalCount={totalCount}
            />

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
                        <ShoppingItemRow
                            key={item.id}
                            item={item}
                            localPurchased={localPurchased}
                            togglePurchased={togglePurchased}
                            openLightbox={openLightbox}
                            onEditCircle={onEditCircle}
                            handleDelete={handleDelete}
                        />
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
