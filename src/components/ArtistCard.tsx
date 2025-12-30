import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Image as ImageIcon, List as ListIcon, Edit2, ShoppingCart, Trash2, Heart } from "lucide-react";
import styles from "./ArtistCard.module.css";
import ImageLightbox from "./ImageLightbox";

interface ArtistCardProps {
    circle: any;
    onEdit: (step?: 1 | 2) => void;
    onDelete: (id: string) => void;
    onToggleFavorite: (id: string, isFavorite: boolean) => void;
    variant?: "card" | "row";
}

export default function ArtistCard({ circle, onEdit, onDelete, onToggleFavorite, variant = "card" }: ArtistCardProps) {
    const [view, setView] = useState<"image" | "list">("image");
    const [imageIndex, setImageIndex] = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);
    // Construct image array
    const images = (circle.image_urls && circle.image_urls.length > 0) ? circle.image_urls : (circle.map_url ? [circle.map_url] : []);

    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        setContentHeight(e.currentTarget.offsetHeight);
    };

    if (variant === "row") {
        return (
            <div className={`${styles.rowCard} glass-card`}>
                <div className={styles.rowThumb} onClick={() => circle.map_url && setIsLightboxOpen(true)}>
                    {circle.map_url ? (
                        <img src={circle.map_url} alt="Circle" className={styles.rowPreview} />
                    ) : (
                        <div className={styles.rowPlaceholder}>
                            <ImageIcon size={20} className="muted" />
                        </div>
                    )}
                </div>

                <div className={styles.rowMain}>
                    <div className={styles.rowInfo}>
                        {circle.x_url ? (
                            <h3 className={styles.rowArtistName}>
                                <a href={circle.x_url} target="_blank" rel="noopener noreferrer" className={styles.artistLink}>
                                    {circle.artist}
                                </a>
                            </h3>
                        ) : (
                            <h3 className={styles.rowArtistName}>{circle.artist}</h3>
                        )}
                        {circle.name && <p className={styles.rowCircleName}>{circle.name}</p>}
                    </div>
                </div>

                <div className={styles.rowRight}>
                    <div className={styles.rowLocationBadge}>
                        <MapPin size={12} />
                        <span>{circle.day}日目 {circle.formatted_location || `${circle.area}${circle.block}-${circle.space_number}`}</span>
                    </div>
                    <div className={styles.rowActions}>
                        <button className={styles.rowEditBtn} onClick={() => onEdit(1)}>
                            <Edit2 size={16} />
                            <span>Edit</span>
                        </button>
                        <button className={styles.rowBuyBtn} onClick={() => onEdit(2)}>
                            <ShoppingCart size={16} />
                            <span>Buy</span>
                        </button>
                        <button
                            className={`${styles.rowFavoriteBtn} ${circle.is_favorite ? styles.active : ""}`}
                            onClick={() => onToggleFavorite(circle.id, !!circle.is_favorite)}
                        >
                            <Heart size={16} fill={circle.is_favorite ? "currentColor" : "none"} />
                        </button>
                        <button className={styles.rowDeleteBtn} onClick={() => onDelete(circle.id)}>
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>

                <ImageLightbox
                    isOpen={isLightboxOpen}
                    imageUrls={images}
                    onClose={() => setIsLightboxOpen(false)}
                />
            </div>
        );
    }

    return (
        <div className={`${styles.card} glass-card`}>
            <div className={styles.header}>
                <div className={styles.artistInfo}>
                    {circle.x_url ? (
                        <h3 className={styles.artistName}>
                            <a href={circle.x_url} target="_blank" rel="noopener noreferrer" className={styles.artistLink}>
                                {circle.artist}
                            </a>
                        </h3>
                    ) : (
                        <h3 className={styles.artistName}>{circle.artist}</h3>
                    )}
                    {circle.name && <p className={styles.circleName}>{circle.name}</p>}
                </div>
                <div className={styles.locationBadge}>
                    <MapPin size={12} />
                    <span>{circle.day}日目 {circle.formatted_location || `${circle.area}${circle.block}-${circle.space_number}`}</span>
                </div>
            </div>

            <div
                className={styles.content}
                style={{
                    minHeight: view === "list" && contentHeight ? `${contentHeight}px` : undefined
                }}
            >
                {view === "image" ? (
                    <div className={styles.imageWrapper}>
                        {circle.map_url ? (
                            <>
                                <div className={styles.imageSwipeContainer}>
                                    <motion.div
                                        className={styles.carousel}
                                        animate={{ x: `-${imageIndex * 100}%` }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        drag={images.length > 1 ? "x" : false}
                                        dragConstraints={{ left: 0, right: 0 }}
                                        dragElastic={0.6}
                                        onDragEnd={(e, info) => {
                                            const threshold = 50;
                                            if (info.offset.x < -threshold && imageIndex < images.length - 1) {
                                                setImageIndex(prev => prev + 1);
                                            } else if (info.offset.x > threshold && imageIndex > 0) {
                                                setImageIndex(prev => prev - 1);
                                            }
                                        }}
                                    >
                                        {images.map((url: string, index: number) => (
                                            <div key={`${url}-${index}`} className={styles.slide}>
                                                <img
                                                    src={url}
                                                    alt={`Slide ${index}`}
                                                    className={styles.priceListImage}
                                                    onLoad={index === 0 ? handleImageLoad : undefined}
                                                    onClick={() => setIsLightboxOpen(true)}
                                                />
                                            </div>
                                        ))}
                                    </motion.div>
                                </div>
                                {images.length > 1 && (
                                    <div className={styles.cardCounter}>
                                        {imageIndex + 1} / {images.length}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className={styles.placeholder}>
                                <ImageIcon size={48} className="muted" />
                                <p>No Image</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={styles.itemsList}>
                        {circle.items?.map((item: any) => (
                            <div key={item.id} className={styles.itemRow}>
                                <span className={styles.itemName}>{item.name}</span>
                                <span className={styles.itemPrice}>¥{item.price}</span>
                                {item.is_wanted && <span className={styles.wantedBadge}>Wanted</span>}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className={styles.footer}>
                <div className={styles.viewToggle}>
                    <button
                        className={`${styles.toggleBtn} ${view === "image" ? styles.active : ""}`}
                        onClick={() => setView("image")}
                    >
                        <ImageIcon size={16} />
                    </button>
                    <button
                        className={`${styles.toggleBtn} ${view === "list" ? styles.active : ""}`}
                        onClick={() => setView("list")}
                    >
                        <ListIcon size={16} />
                    </button>
                </div>
                <div className={styles.actions}>
                    <button className={styles.editBtn} onClick={() => onEdit(1)}>
                        <Edit2 size={16} />
                        <span>Edit</span>
                    </button>
                    <button className={styles.buyBtn} onClick={() => onEdit(2)}>
                        <ShoppingCart size={16} />
                        <span>Buy</span>
                    </button>
                    <button
                        className={`${styles.favoriteBtn} ${circle.is_favorite ? styles.active : ""}`}
                        onClick={() => onToggleFavorite(circle.id, !!circle.is_favorite)}
                    >
                        <Heart size={16} fill={circle.is_favorite ? "currentColor" : "none"} />
                    </button>
                    <button className={styles.deleteBtn} onClick={() => onDelete(circle.id)}>
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <ImageLightbox
                isOpen={isLightboxOpen}
                imageUrls={images}
                initialIndex={imageIndex}
                onClose={() => setIsLightboxOpen(false)}
            />
        </div>
    );
}
