import React from "react";
import { Compass, ShoppingBag, MapPin, Settings, Plus } from "lucide-react";
import styles from "../page.module.css";

interface BottomNavProps {
    activeTab: string;
    onTabClick: (tab: string) => void;
    onAddClick: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
    activeTab,
    onTabClick,
    onAddClick,
}) => {
    return (
        <nav className={styles.bottomNav}>
            <button
                className={activeTab === "feed" ? styles.active : ""}
                onClick={() => onTabClick("feed")}
            >
                <Compass size={22} />
                <span>Feed</span>
            </button>
            <button
                className={activeTab === "list" ? styles.active : ""}
                onClick={() => onTabClick("list")}
            >
                <ShoppingBag size={22} />
                <span>List</span>
            </button>
            <div style={{ width: "60px" }}></div>
            <button
                className={activeTab === "map" ? styles.active : ""}
                onClick={() => onTabClick("map")}
            >
                <MapPin size={22} />
                <span>Map</span>
            </button>
            <button
                className={activeTab === "settings" ? styles.active : ""}
                onClick={() => onTabClick("settings")}
            >
                <Settings size={22} />
                <span>Settings</span>
            </button>
            <button className={styles.fab} onClick={onAddClick} title="Add Item">
                <Plus size={24} />
            </button>
        </nav>
    );
};
