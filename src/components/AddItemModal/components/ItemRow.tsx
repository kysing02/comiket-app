import React from "react";
import { Trash2, Plus, Minus } from "lucide-react";
import styles from "../../AddItemModal.module.css";

interface ItemRowProps {
    item: any;
    index: number;
    dbBuyers: any[];
    onItemChange: (index: number, field: string, value: any) => void;
    onRemoveItem: (index: number) => void;
    onToggleBuyer: (itemIndex: number, buyerId: string) => void;
    onToggleTag: (itemIndex: number, color: string) => void;
}

export const ItemRow: React.FC<ItemRowProps> = ({
    item,
    index,
    dbBuyers,
    onItemChange,
    onRemoveItem,
    onToggleBuyer,
    onToggleTag,
}) => {
    return (
        <div className={`${styles.itemRow} glass`}>
            <div className={styles.itemMainRow}>
                <input
                    type="text"
                    placeholder="Item Name"
                    value={item.name}
                    onChange={(e) => onItemChange(index, "name", e.target.value)}
                    className={styles.itemNameInput}
                />
                <div className={styles.itemMetaActions}>
                    <input
                        type="number"
                        placeholder="¥"
                        value={item.price}
                        onChange={(e) => onItemChange(index, "price", e.target.value)}
                        className={styles.itemPriceInput}
                    />
                    <div className={styles.qtyControl}>
                        <button
                            className={styles.qtyBtn}
                            onClick={() => onItemChange(index, "quantity", Math.max(0, (item.quantity || 0) - 1))}
                            disabled={(item.quantity || 0) <= 0}
                        >
                            <Minus size={12} />
                        </button>
                        <input
                            type="number"
                            placeholder="0"
                            min="0"
                            value={item.quantity || 0}
                            readOnly
                            className={styles.itemQtyInput}
                        />
                        <button
                            className={styles.qtyBtn}
                            onClick={() => onItemChange(index, "quantity", (item.quantity || 0) + 1)}
                        >
                            <Plus size={12} />
                        </button>
                    </div>
                    <div className={styles.priorityWrapper}>
                        <select
                            value={item.priority}
                            onChange={(e) => onItemChange(index, "priority", e.target.value)}
                            className={styles.itemPrioritySelect}
                        >
                            <option value="High">高</option>
                            <option value="Medium">中</option>
                            <option value="Low">低</option>
                        </select>
                    </div>
                    <button className={styles.removeBtn} onClick={() => onRemoveItem(index)}>
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <div className={styles.buyerChipContainer}>
                {dbBuyers?.map(buyer => (
                    <div
                        key={buyer.id}
                        className={`${styles.buyerChip} ${(item.buyerIds || []).includes(buyer.id) ? styles.active : ""}`}
                        onClick={() => onToggleBuyer(index, buyer.id)}
                    >
                        {buyer.name}
                    </div>
                ))}
            </div>

            <div className={styles.tagContainer}>
                <div className={styles.colorSelector}>
                    {['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#6b7280'].map(c => (
                        <div
                            key={c}
                            className={`${styles.colorDot} ${(item.tags || []).includes(c) ? styles.active : ""}`}
                            style={{ backgroundColor: c, color: c }}
                            onClick={() => onToggleTag(index, c)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
