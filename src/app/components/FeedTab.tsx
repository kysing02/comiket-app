import React from "react";
import { Search, LayoutGrid, LayoutList, Compass } from "lucide-react";
import styles from "../page.module.css";
import ArtistCard from "@/components/ArtistCard";
import { ScrapedInbox } from "./ScrapedInbox";

interface FeedTabProps {
    feedSearch: string;
    setFeedSearch: (val: string) => void;
    viewMode: "grid" | "list";
    setViewMode: (mode: "grid" | "list") => void;
    scrapedPosts: any[];
    handleMarkAsRead: (postId: string) => void;
    handleImportPost: (post: any) => void;
    circles: any[];
    onEditCircle: (circle: any, step?: 1 | 2) => void;
    onDeleteCircle: (id: string) => void;
}

export const FeedTab: React.FC<FeedTabProps> = ({
    feedSearch,
    setFeedSearch,
    viewMode,
    setViewMode,
    scrapedPosts,
    handleMarkAsRead,
    handleImportPost,
    circles,
    onEditCircle,
    onDeleteCircle,
}) => {
    const filteredCircles = circles.filter(c => !feedSearch ||
        c.name?.toLowerCase().includes(feedSearch.toLowerCase()) ||
        c.artist?.toLowerCase().includes(feedSearch.toLowerCase())
    );

    return (
        <div className={styles.feedScrollArea}>
            <div className={styles.feedSearchWrapper}>
                <div className={styles.searchBox}>
                    <Search size={18} className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search artist, circle, or content..."
                        value={feedSearch}
                        onChange={(e) => setFeedSearch(e.target.value)}
                        className="glass"
                    />
                </div>
                <div className={styles.viewToggle}>
                    <button
                        className={`${styles.toggleBtn} ${viewMode === 'grid' ? styles.active : ''}`}
                        onClick={() => setViewMode('grid')}
                        title="Grid View"
                    >
                        <LayoutGrid size={18} />
                    </button>
                    <button
                        className={`${styles.toggleBtn} ${viewMode === 'list' ? styles.active : ''}`}
                        onClick={() => setViewMode('list')}
                        title="List View"
                    >
                        <LayoutList size={18} />
                    </button>
                </div>
            </div>

            <ScrapedInbox
                posts={scrapedPosts}
                searchQuery={feedSearch}
                handleMarkAsRead={handleMarkAsRead}
                handleImportPost={handleImportPost}
            />

            <div className={viewMode === "grid" ? styles.artistGrid : styles.artistList}>
                {filteredCircles.length > 0 ? (
                    filteredCircles.map((circle) => (
                        <ArtistCard
                            key={circle.id}
                            circle={circle}
                            variant={viewMode === "grid" ? "card" : "row"}
                            onEdit={(step) => onEditCircle(circle, step)}
                            onDelete={onDeleteCircle}
                        />
                    ))
                ) : (
                    <div className={styles.emptyState}>
                        <div className={`${styles.emptyIcon} glass`}>
                            <Compass size={48} className={styles.mutedIcon} />
                        </div>
                        <h2>Feed is empty</h2>
                        <p>Register artists via X Scraper or "+" button</p>
                    </div>
                )}
            </div>
        </div>
    );
};
