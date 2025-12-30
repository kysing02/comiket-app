"use client";

import { useState } from "react";
import styles from "./ShoppingList.module.css";
import { supabase } from "@/lib/supabase";
import ImageLightbox from "./ImageLightbox";
import { ShoppingItemRow } from "./ShoppingList/components/ShoppingItemRow";
import { ConfirmModal } from "./ConfirmModal";

interface ShoppingListProps {
    items: any[];
    onUpdate: (silent?: boolean) => void;
    onEditCircle: (circle: any, step?: 1 | 2) => void;
    dbBuyers: any[];
    sortConfig: { key: string, direction: 'asc' | 'desc' } | null;
    onSort: (key: string) => void;
    onClearFilters: () => void;
}

export default function ShoppingList({
    items,
    onUpdate,
    onEditCircle,
    dbBuyers,
    sortConfig,
    onSort,
    onClearFilters
}: ShoppingListProps) {
    // Lightbox State
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxImages, setLightboxImages] = useState<string[]>([]);

    // Confirm Modal State
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<{ id: string, name: string } | null>(null);

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

    const openLightbox = (itemImg?: string, circleImgs?: string[], mapUrl?: string) => {
        let imagesToView: string[] = [];
        if (itemImg) imagesToView.push(itemImg);
        if (Array.isArray(circleImgs)) {
            circleImgs.forEach(url => {
                if (url && !imagesToView.includes(url)) imagesToView.push(url);
            });
        }
        if (mapUrl && !imagesToView.includes(mapUrl)) {
            imagesToView.push(mapUrl);
        }
        if (imagesToView.length > 0) {
            setLightboxImages(imagesToView);
            setLightboxOpen(true);
        }
    }

    const handleDelete = (id: string, name: string) => {
        setPendingDelete({ id, name });
        setConfirmOpen(true);
    };

    const executeDelete = async () => {
        if (!pendingDelete) return;
        const { error } = await supabase.from("items").update({ quantity: 0 }).eq("id", pendingDelete.id);
        if (error) {
            console.error("Failed to update item", error);
        } else {
            onUpdate(true); // Silent refresh
        }
        setPendingDelete(null);
    };

    return (
        <div className={styles.container}>
            <ConfirmModal
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={executeDelete}
                title="Remove Item?"
                message={`Are you sure you want to remove "${pendingDelete?.name}" from your shopping list?`}
                confirmText="Remove"
                isDanger={true}
            />

            <div className={styles.tableScroll}>
                <div className={styles.list}>
                    {items.map((item) => (
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

                    {items.length === 0 && (
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
        </div >
    );
}
