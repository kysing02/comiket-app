import { useState } from "react";
import { MapPin, Image as ImageIcon, List as ListIcon, Edit2, ShoppingCart, Trash2 } from "lucide-react";
import styles from "./ArtistCard.module.css";
import ImageLightbox from "./ImageLightbox";

interface ArtistCardProps {
    circle: any;
    onEdit: () => void;
    onDelete: (id: string) => void;
}

export default function ArtistCard({ circle, onEdit, onDelete }: ArtistCardProps) {
    const [view, setView] = useState<"image" | "list">("image");
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);

    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        setContentHeight(e.currentTarget.offsetHeight);
    };

    return (
        <div className={`${styles.card} glass-card`}>
            <div className={styles.header}>
                <div className={styles.artistInfo}>
                    {circle.x_url ? (
                        <a href={circle.x_url} target="_blank" rel="noopener noreferrer" className={styles.artistLink}>
                            <h3 className={styles.artistName}>{circle.artist}</h3>
                        </a>
                    ) : (
                        <h3 className={styles.artistName}>{circle.artist}</h3>
                    )}
                    {circle.name && <p className={styles.circleName}>{circle.name}</p>}
                </div>
                <div className={styles.locationBadge}>
                    <MapPin size={12} />
                    <span>{circle.day}日目 {circle.area}{circle.block}-{circle.space_number}</span>
                </div>
            </div>

            <div
                className={styles.content}
                style={{
                    minHeight: view === "list" && contentHeight ? `${contentHeight}px` : undefined
                }}
            >
                {view === "image" ? (
                    <div className={styles.imageWrapper} onClick={() => circle.map_url && setIsLightboxOpen(true)}>
                        {circle.map_url ? (
                            <img
                                src={circle.map_url}
                                alt="Price List"
                                className={styles.priceListImage}
                                onLoad={handleImageLoad}
                            />
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
                    <button className={styles.editBtn} onClick={onEdit}>
                        <Edit2 size={16} />
                        <span>Edit / Buy</span>
                    </button>
                    <button className={styles.deleteBtn} onClick={() => onDelete(circle.id)}>
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <ImageLightbox
                isOpen={isLightboxOpen}
                imageUrl={circle.map_url}
                onClose={() => setIsLightboxOpen(false)}
            />
        </div>
    );
}
