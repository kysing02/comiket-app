import React from "react";
import { Check, Image as ImageIcon, Trash2, Edit2 } from "lucide-react";
import styles from "../../ShoppingList.module.css";

interface ShoppingItemRowProps {
    item: any;
    localPurchased: Record<string, boolean>;
    togglePurchased: (itemId: string, currentStatus: boolean) => void;
    openLightbox: (itemImg?: string, circleImgs?: string[], mapUrl?: string) => void;
    onEditCircle: (circle: any, step?: 1 | 2) => void;
    handleDelete: (id: string, name: string) => void;
}

export const ShoppingItemRow: React.FC<ShoppingItemRowProps> = ({
    item,
    localPurchased,
    togglePurchased,
    openLightbox,
    onEditCircle,
    handleDelete,
}) => {
    const isPurchased = localPurchased[item.id] ?? item.is_purchased;

    return (
        <div
            className={`${styles.tableRow} ${isPurchased ? styles.purchasedRow : ""} glass-card`}
            onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest(`.${styles.checkbox}`) ||
                    target.closest(`.${styles.imgBtn}`) ||
                    target.closest(`.${styles.deleteBtn}`) ||
                    target.closest(`.${styles.editBtn}`)) {
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
                    className={`${styles.checkbox} ${isPurchased ? styles.checked : ""}`}
                    onClick={() => togglePurchased(item.id, isPurchased)}
                >
                    {isPurchased && <Check size={16} />}
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
                    <button
                        className={styles.imgBtn}
                        onClick={() => openLightbox(item.image_url, item.circles?.image_urls, item.circles?.map_url)}
                    >
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
    );
};
