import React from "react";
import { Plus } from "lucide-react";
import styles from "../../AddItemModal.module.css";
import { ItemRow } from "./ItemRow";

interface ItemListSectionProps {
    items: any[];
    priceListImages: string[];
    dbBuyers: any[];
    onItemChange: (index: number, field: string, value: any) => void;
    onRemoveItem: (index: number) => void;
    onToggleBuyer: (itemIndex: number, buyerId: string) => void;
    onToggleTag: (itemIndex: number, color: string) => void;
    onAddItem: () => void;
    setLightboxOpen: (open: boolean) => void;
    setLightboxImages: (images: string[]) => void;
}

export const ItemListSection: React.FC<ItemListSectionProps> = ({
    items,
    priceListImages,
    dbBuyers,
    onItemChange,
    onRemoveItem,
    onToggleBuyer,
    onToggleTag,
    onAddItem,
    setLightboxOpen,
    setLightboxImages,
}) => {
    return (
        <div className={styles.itemsSection}>
            {/* Fixed Header with Price List Preview if available */}
            {priceListImages.length > 0 && priceListImages[0] && (
                <div
                    className={styles.fixedPreview}
                    onClick={() => {
                        setLightboxImages(priceListImages);
                        setLightboxOpen(true);
                    }}
                >
                    <div className={styles.fixedPreviewInner}>
                        <img src={priceListImages[0]} alt="Reference" />
                        <span className={styles.previewHint}>Tap to Zoom ({priceListImages.length})</span>
                    </div>
                </div>
            )}

            <div className={styles.itemsHeader}>
                <h3>Items to Purchase</h3>
                <button className={styles.addItemBtn} onClick={onAddItem}>
                    <Plus size={16} /> Add
                </button>
            </div>

            <div className={styles.itemsScrollContainer}>
                <div className={styles.itemsList}>
                    {items.map((item, index) => (
                        <ItemRow
                            key={item.id}
                            item={item}
                            index={index}
                            dbBuyers={dbBuyers || []}
                            onItemChange={onItemChange}
                            onRemoveItem={onRemoveItem}
                            onToggleBuyer={onToggleBuyer}
                            onToggleTag={onToggleTag}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
