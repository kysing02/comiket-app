import React from "react";
import styles from "../page.module.css";

interface ScrapedInboxProps {
    posts: any[];
    searchQuery: string;
    handleMarkAsRead: (postId: string) => void;
    handleImportPost: (post: any) => void;
}

export const ScrapedInbox: React.FC<ScrapedInboxProps> = ({
    posts,
    searchQuery,
    handleMarkAsRead,
    handleImportPost,
}) => {
    const filteredPosts = posts.filter(p => !searchQuery ||
        p.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filteredPosts.length === 0) return null;

    return (
        <section className={styles.scrapedSection}>
            <h3 className={styles.sectionTitle}>
                Inbox: Scraped from X ({filteredPosts.length})
            </h3>
            <div className={styles.scrapedGrid}>
                {filteredPosts.map((post) => (
                    <div key={post.id} className={`${styles.scrapedCard} glass`}>
                        <div className={styles.scrapedHeader}>
                            <span className={styles.scrapedArtist}>{post.username || "X Post"}</span>
                        </div>
                        <div className={styles.scrapedContent}>
                            <p>{post.content}</p>
                            {post.image_urls?.length > 0 && (
                                <div className={styles.scrapedImages}>
                                    {post.image_urls.slice(0, 4).map((img: string, i: number) => (
                                        <img key={i} src={img} alt="Preview" />
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className={styles.scrapedActions}>
                            <button
                                className={styles.ignoreBtn}
                                onClick={() => handleMarkAsRead(post.id)}
                            >
                                Ignore
                            </button>
                            <button
                                className={styles.importBtn}
                                onClick={() => handleImportPost(post)}
                            >
                                Import
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};
