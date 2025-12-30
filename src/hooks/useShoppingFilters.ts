"use client";

import { useState, useEffect } from "react";

export function useShoppingFilters(items: any[]) {
    const [filterDay, setFilterDay] = useState<string | null>(null);
    const [filterArea, setFilterArea] = useState<string | null>(null);
    const [filterPriority, setFilterPriority] = useState<string[]>([]);
    const [filterTags, setFilterTags] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterBuyer, setFilterBuyer] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'circle', direction: 'asc' });
    const [isFiltersInitialized, setIsFiltersInitialized] = useState(false);

    // Load Filters from LocalStorage
    useEffect(() => {
        const savedFilters = localStorage.getItem("shopping_list_filters");
        if (savedFilters) {
            try {
                const parsed = JSON.parse(savedFilters);
                setFilterDay(parsed.filterDay || null);
                setFilterArea(parsed.filterArea || null);
                setFilterPriority(parsed.filterPriority || []);
                setFilterTags(parsed.filterTags || []);
                setFilterBuyer(parsed.filterBuyer || null);
                setSearchQuery(parsed.searchQuery || "");
                if (parsed.sortConfig) setSortConfig(parsed.sortConfig);
            } catch (e) {
                console.error("Failed to load filters", e);
            }
        }
        setIsFiltersInitialized(true);
    }, []);

    // Save Filters to LocalStorage
    useEffect(() => {
        if (!isFiltersInitialized) return;
        const toSave = {
            filterDay,
            filterArea,
            filterPriority,
            filterTags,
            filterBuyer,
            searchQuery,
            sortConfig
        };
        localStorage.setItem("shopping_list_filters", JSON.stringify(toSave));
    }, [filterDay, filterArea, filterPriority, filterTags, filterBuyer, searchQuery, sortConfig, isFiltersInitialized]);

    const togglePriorityFilter = (priority: string) => {
        setFilterPriority(prev =>
            prev.includes(priority) ? prev.filter(p => p !== priority) : [...prev, priority]
        );
    };

    const toggleTagFilter = (color: string) => {
        setFilterTags(prev =>
            prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
        );
    };

    const clearPriorityFilter = () => setFilterPriority([]);
    const clearTagFilter = () => setFilterTags([]);

    const filteredItems = items.filter(it => {
        if ((it.quantity || 0) <= 0) return false;
        const dayMatch = !filterDay || it.circles?.day === filterDay;
        const areaMatch = !filterArea || it.circles?.area === filterArea;
        const priorityMatch = filterPriority.length === 0 || filterPriority.includes(it.priority);
        const tagMatch = filterTags.length === 0 || filterTags.some((t: string) => it.tags?.includes(t));
        const searchMatch = !searchQuery ||
            it.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            it.circles?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            it.circles?.artist?.toLowerCase().includes(searchQuery.toLowerCase());

        const buyerMatch = !filterBuyer ||
            (filterBuyer === "None" && (!it.item_buyers || it.item_buyers.length === 0) && !it.buyer) ||
            (it.item_buyers?.some((ib: any) => ib.buyers?.name === filterBuyer)) ||
            (it.buyer === filterBuyer);

        return dayMatch && areaMatch && priorityMatch && tagMatch && searchMatch && buyerMatch;
    });

    const getSortedItems = (itemsList: any[]) => {
        if (!sortConfig) return itemsList;

        return [...itemsList].sort((a, b) => {
            let aVal: any, bVal: any;

            switch (sortConfig.key) {
                case 'status':
                    aVal = a.is_purchased ? 1 : 0;
                    bVal = b.is_purchased ? 1 : 0;
                    break;
                case 'circle':
                    aVal = `${a.circles?.day || "9"}-${a.circles?.formatted_location || ""}`;
                    bVal = `${b.circles?.day || "9"}-${b.circles?.formatted_location || ""}`;
                    break;
                case 'gojuon': {
                    const getSortKey = (item: any) => {
                        const areaOrder = item.circles?.area === "東" ? "1" : (item.circles?.area === "西" ? "2" : "3");
                        return `${areaOrder}-${item.circles?.name || ""}`;
                    };
                    aVal = getSortKey(a);
                    bVal = getSortKey(b);
                    const result = aVal.localeCompare(bVal, 'ja');
                    return sortConfig.direction === 'asc' ? result : -result;
                }
                case 'price':
                    aVal = a.price || 0;
                    bVal = b.price || 0;
                    break;
                case 'priority': {
                    const pMap: Record<string, number> = { "High": 3, "Medium": 2, "Low": 1 };
                    aVal = pMap[a.priority] || 0;
                    bVal = pMap[b.priority] || 0;
                    break;
                }
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

    const sortedItems = getSortedItems(filteredItems);

    // Stats
    const totalPrice = filteredItems.reduce((sum, it) => sum + (it.price || 0), 0);
    const purchasedPrice = filteredItems.reduce((sum, it) => sum + (it.is_purchased ? it.price || 0 : 0), 0);
    const totalCount = filteredItems.length;
    const purchasedCount = filteredItems.filter(it => it.is_purchased).length;

    const resetFilters = () => {
        setFilterDay(null);
        setFilterArea(null);
        setFilterPriority([]);
        setFilterTags([]);
        setSearchQuery("");
        setFilterBuyer(null);
        setSortConfig({ key: 'circle', direction: 'asc' });
    };

    return {
        filterDay, setFilterDay,
        filterArea, setFilterArea,
        filterPriority, togglePriorityFilter, clearPriorityFilter,
        filterTags, toggleTagFilter, clearTagFilter,
        searchQuery, setSearchQuery,
        filterBuyer, setFilterBuyer,
        sortConfig, setSortConfig,
        resetFilters,
        filteredItems,
        sortedItems,
        totalPrice,
        purchasedPrice,
        totalCount,
        purchasedCount
    };
}
