import React from "react";
import { Plus, X, Image as ImageIcon, Link as LinkIcon } from "lucide-react";
import styles from "../../AddItemModal.module.css";
import { standardizeLocation } from "@/lib/location";

interface ArtistInfoFormProps {
    artist: string;
    setArtist: (val: string) => void;
    circleName: string;
    setCircleName: (val: string) => void;
    day: string;
    setDay: (val: string) => void;
    location: string;
    setLocation: (val: string) => void;
    priceListImages: string[];
    setPriceListImages: (images: string[]) => void;
    addPriceListImage: () => void;
    setLightboxOpen: (open: boolean) => void;
    setLightboxImages: (images: string[]) => void;
}

export const ArtistInfoForm: React.FC<ArtistInfoFormProps> = ({
    artist,
    setArtist,
    circleName,
    setCircleName,
    day,
    setDay,
    location,
    setLocation,
    priceListImages,
    setPriceListImages,
    addPriceListImage,
    setLightboxOpen,
    setLightboxImages,
}) => {
    return (
        <div className={styles.formSection}>
            <div className={styles.grid2}>
                <div className={styles.inputGroup}>
                    <label>Artist Name *</label>
                    <input
                        type="text"
                        value={artist}
                        onChange={(e) => setArtist(e.target.value)}
                        className="glass"
                    />
                </div>
                <div className={styles.inputGroup}>
                    <label>Circle Name</label>
                    <input
                        type="text"
                        value={circleName}
                        onChange={(e) => setCircleName(e.target.value)}
                        className="glass"
                    />
                </div>
            </div>

            <div className={styles.grid2}>
                <div className={styles.inputGroup}>
                    <label>Day (C107)</label>
                    <select
                        value={day}
                        onChange={(e) => setDay(e.target.value)}
                        className="glass"
                    >
                        <option value="1">1日目 - 12/30（火）</option>
                        <option value="2">2日目 - 12/31（水）</option>
                    </select>
                </div>
                <div className={styles.inputGroup}>
                    <label>Location</label>
                    <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        onBlur={(e) => setLocation(standardizeLocation("", "", e.target.value))}
                        placeholder="東あ-01a"
                        className="glass"
                    />
                </div>
            </div>

            <div className={styles.inputGroup}>
                <div className={styles.labelRow}>
                    <label>Price List Images</label>
                    <div className={styles.labelActions}>
                        <span className={styles.labelHint}>Only the first image is auto-read. Add others manually!</span>
                        <button className={styles.addImgBtn} onClick={addPriceListImage}>
                            <Plus size={14} /> Add Image
                        </button>
                    </div>
                </div>

                {priceListImages.map((imgUrl, idx) => (
                    <div key={idx} className={styles.imageInputRow}>
                        {imgUrl && (
                            <img
                                src={imgUrl}
                                className={styles.imageThumb}
                                alt={`Preview ${idx + 1}`}
                                onClick={() => {
                                    setLightboxImages([imgUrl]);
                                    setLightboxOpen(true);
                                }}
                            />
                        )}
                        <div className={styles.imageInputWrapper}>
                            <input
                                type="text"
                                value={imgUrl}
                                onChange={(e) => {
                                    const newImages = [...priceListImages];
                                    newImages[idx] = e.target.value;
                                    setPriceListImages(newImages);
                                }}
                                placeholder={`Image URL ${idx + 1}`}
                                className="glass"
                            />
                            {imgUrl && (
                                <div className={styles.inputActionOverlay}>
                                    <button
                                        className={styles.previewBtn}
                                        onClick={() => { setLightboxImages([imgUrl]); setLightboxOpen(true); }}
                                        title="Preview"
                                    >
                                        <ImageIcon size={14} />
                                    </button>
                                    <button
                                        className={styles.linkBtn}
                                        onClick={() => window.open(imgUrl, '_blank')}
                                        title="Open Layout"
                                    >
                                        <LinkIcon size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                        {priceListImages.length > 1 && (
                            <button
                                className={styles.removeImgBtn}
                                onClick={() => setPriceListImages(priceListImages.filter((_, i) => i !== idx))}
                                title="Remove"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
