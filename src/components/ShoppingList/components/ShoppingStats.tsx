import React from "react";
import styles from "../../ShoppingList.module.css";

interface ShoppingStatsProps {
    purchasedPrice: number;
    totalPrice: number;
    purchasedCount: number;
    totalCount: number;
}

export const ShoppingStats: React.FC<ShoppingStatsProps> = ({
    purchasedPrice,
    totalPrice,
    purchasedCount,
    totalCount,
}) => {
    return (
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
    );
};
