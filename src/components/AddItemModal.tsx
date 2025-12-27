"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Plus, Trash2, Link as LinkIcon, Sparkles, Settings2, ChevronLeft, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./AddItemModal.module.css";
import { supabase } from "@/lib/supabase";
import { performOCR } from "@/lib/ai";
import ImageLightbox from "./ImageLightbox";

interface AddItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
    globalSettings?: any;
    initialStep?: 1 | 2;
}

export default function AddItemModal({ isOpen, onClose, onSuccess, initialData, globalSettings, initialStep }: AddItemModalProps) {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<1 | 2>(initialStep || 1);
    const [xUrl, setXUrl] = useState("");
    const [priceListImages, setPriceListImages] = useState<string[]>([""]);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxImages, setLightboxImages] = useState<string[]>([]);

    // AI & Settings State
    const [aiModel, setAiModel] = useState<any>(globalSettings?.aiModel || "gemini-3-flash-preview");
    const [ocrMethod, setOcrMethod] = useState<any>(globalSettings?.ocrMethod || "vision");
    const [extractItems, setExtractItems] = useState(true); // Default true, user can toggle for speed
    const [showSettings, setShowSettings] = useState(false);

    // Form State
    const [circleName, setCircleName] = useState("");
    const [artist, setArtist] = useState("");
    const [day, setDay] = useState("1");
    const [location, setLocation] = useState("");
    const [items, setItems] = useState([{ id: Math.random().toString(), name: "", price: "", quantity: 0, priority: "Medium", buyer: "", isWanted: false, tags: [] as any[] }]);
    const [retryTimer, setRetryTimer] = useState<number | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Cleanup initialized state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setIsInitialized(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (retryTimer === null) return;
        if (retryTimer <= 0) {
            setRetryTimer(null);
            return;
        }
        const timer = setTimeout(() => setRetryTimer(retryTimer - 1), 1000);
        return () => clearTimeout(timer);
    }, [retryTimer]);

    // Reset step when modal opens with new initialData/initialStep
    useEffect(() => {
        if (isOpen) {
            setStep(initialStep || 1);
        }
    }, [isOpen, initialStep]);

    // Draft Logic
    useEffect(() => {
        // Save draft on change (only if initialized)
        if (!isOpen || !isInitialized) return;
        const draftKey = initialData?.scraped_id
            ? `draft_scraped_${initialData.scraped_id}`
            : initialData?.id ? `draft_edit_${initialData.id}` : `draft_manual`;

        const draftData = {
            circleName, artist, day, location, items, xUrl, priceListImages
        };
        localStorage.setItem(draftKey, JSON.stringify(draftData));
    }, [circleName, artist, day, location, items, xUrl, priceListImages, isOpen, initialData, isInitialized]);

    useEffect(() => {
        if (!isOpen) return;

        if (initialData) {
            // Check for draft first for Scraped/Edit items
            const draftKey = initialData.scraped_id
                ? `draft_scraped_${initialData.scraped_id}`
                : initialData.id ? `draft_edit_${initialData.id}` : null;

            const savedDraft = draftKey ? localStorage.getItem(draftKey) : null;

            if (savedDraft) {
                try {
                    const d = JSON.parse(savedDraft);
                    setCircleName(d.circleName);
                    setArtist(d.artist);
                    setDay(d.day);
                    setLocation(d.location);
                    // Smart Merge: If draft has empty URL/Image but initialData has it, prefer initialData
                    setPriceListImages(d.priceListImages && d.priceListImages.length > 0 ? d.priceListImages : [initialData.map_url || ""]);
                    setXUrl(d.xUrl || initialData.x_url || "");
                    setItems(d.items);
                } catch (e) {
                    console.error("Draft parse error", e);
                }
            } else {
                // Determine initial values if no draft
                setCircleName(initialData.name || "");
                setArtist(initialData.artist || "");
                setDay(initialData.day || "1");
                setLocation(`${initialData.area || ""}${initialData.block || ""}-${initialData.space_number || ""}`.replace(/^-|-$/, ""));

                if (initialData.scraped_id) {
                    // Import Mode: Start with first image, let user add more
                    setPriceListImages(initialData.image_urls && initialData.image_urls.length > 0 ? [initialData.image_urls[0]] : [initialData.map_url || ""]);
                } else {
                    // Edit Mode: Show all existing images
                    setPriceListImages(initialData.image_urls && initialData.image_urls.length > 0 ? initialData.image_urls : [initialData.map_url || ""]);
                }

                setXUrl(initialData.x_url || "");
                if (initialData.items && initialData.items.length > 0) {
                    setItems(initialData.items.map((it: any) => ({
                        id: it.id || Math.random().toString(),
                        name: it.name,
                        price: it.price?.toString() || "0",
                        quantity: it.quantity || 0,
                        priority: it.priority || "Medium",
                        buyer: it.buyer || globalSettings?.defaultBuyer || "",
                        isWanted: it.is_wanted || false,
                        tags: it.tags || []
                    })));
                } else {
                    setItems([{ id: Math.random().toString(), name: "", price: "", quantity: 0, priority: "Medium", buyer: globalSettings?.defaultBuyer || "", isWanted: false, tags: [] }]);
                }
            }
        } else {
            // New Entry - Check manual draft
            const savedDraft = localStorage.getItem("draft_manual");
            if (savedDraft) {
                try {
                    const d = JSON.parse(savedDraft);
                    setCircleName(d.circleName);
                    setArtist(d.artist);
                    setDay(d.day);
                    setLocation(d.location);
                    setDay(d.day);
                    setLocation(d.location);
                    setPriceListImages(d.priceListImages || [""]);
                    setXUrl(d.xUrl);
                    setItems(d.items);
                } catch (e) {
                    console.error("Draft parse error", e);
                }
            } else {
                setCircleName("");
                setArtist("");
                setDay("1");
                setLocation("");
                setDay("1");
                setLocation("");
                setPriceListImages([""]);
                setXUrl("");
                setItems([{ id: Math.random().toString(), name: "", price: "", quantity: 0, priority: "Medium", buyer: globalSettings?.defaultBuyer || "", isWanted: false, tags: [] }]);
            }
        }
        setIsInitialized(true);
    }, [initialData, isOpen]);

    const handleFetch = async () => {
        const validImages = priceListImages.filter(img => img.trim() !== "");
        if (!xUrl && validImages.length === 0) return;
        setLoading(true);
        try {
            let contextText = initialData?.scrapedContent || xUrl;
            // Use active input images OR fallback to initial data images
            const imageUrls = validImages.length > 0 ? validImages : (initialData?.image_urls || []);

            // 1. Perform local OCR if requested
            if (ocrMethod === "combined" && imageUrls.length > 0) {
                const ocrResult = await performOCR(imageUrls[0]);
                contextText += `\n\n[OCR Text from Image]:\n${ocrResult}`;
            }

            // 2. Call AI API
            const response = await fetch("/api/extract", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    postText: contextText,
                    imageUrls: ocrMethod === "vision" ? imageUrls : [],
                    model: aiModel,
                    includeItems: extractItems,
                    authorName: artist || initialData?.username // Use artist or scraped username
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (errorData.error === 'QUOTA_EXCEEDED') {
                    setRetryTimer(errorData.retryAfter || 60);
                    throw new Error(errorData.message);
                }
                throw new Error(errorData.error || "API Route failed");
            }

            const data = await response.json();

            setCircleName(data.circle?.name || "");
            setArtist(data.circle?.artist || "");
            setDay(data.circle?.day || "1");
            const area = data.circle?.area || "";
            const block = data.circle?.block || "";
            const sn = data.circle?.space_number || "";
            setLocation(`${area}${block}-${sn}`.replace(/^-|-$/, ""));

            if (data.items && data.items.length > 0) {
                setItems(data.items.map((it: any) => ({
                    id: Math.random().toString(),
                    name: it.name,
                    price: it.price?.toString() || "0",
                    quantity: 0,
                    priority: it.priority || "Medium",
                    buyer: globalSettings?.defaultBuyer || "",
                    isWanted: false,
                    tags: []
                })));
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
            alert("Failed to extract data. Please enter manually.");
        } finally {
            setLoading(false);
        }
    };

    const addPriceListImage = () => {
        if (initialData?.image_urls && initialData.image_urls.length > 0) {
            // Find next image in array that's not already in priceListImages
            const nextImg = initialData.image_urls.find((url: string) => !priceListImages.includes(url));
            if (nextImg) {
                setPriceListImages([...priceListImages, nextImg]);
                return;
            }
        }
        // Fallback to empty if no more scraped images
        setPriceListImages([...priceListImages, ""]);
    };

    const addItem = () => {
        setItems([...items, { id: Math.random().toString(), name: "", price: "", quantity: 0, priority: "Medium", buyer: globalSettings?.defaultBuyer || "", isWanted: false, tags: [] }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        (newItems[index] as any)[field] = value;
        setItems(newItems);
    };

    const toggleTag = (itemIndex: number, color: string) => {
        const newItems = [...items];
        const currentTags = newItems[itemIndex].tags || [];
        if (currentTags.includes(color)) {
            newItems[itemIndex].tags = currentTags.filter((c: string) => c !== color);
        } else {
            newItems[itemIndex].tags = [...currentTags, color];
        }
        setItems(newItems);
    };

    const handleSubmit = async () => {
        if (step === 1) {
            if (!artist) {
                alert("Artist name is required.");
                return;
            }
            setStep(2);
            return;
        }

        setLoading(true);
        try {
            // 1. Upsert Circle
            const locMatch = location.match(/^(東|西|East|West)?([A-Z])?-?(.*)/i);
            const area = locMatch?.[1] || "";
            const block = locMatch?.[2] || "";
            const space_number = locMatch?.[3] || location;

            let circleId = initialData?.id;

            if (circleId) {
                const { error: circleError } = await supabase
                    .from("circles")
                    .update({
                        name: circleName,
                        artist,
                        day,
                        area,
                        block,
                        space_number,
                        map_url: priceListImages[0] || "",
                        image_urls: priceListImages.filter(img => img.trim() !== ""), // Update all images
                        x_url: xUrl
                    })
                    .eq("id", circleId);

                if (circleError) throw circleError;
            } else {
                const { data: circle, error: circleError } = await supabase
                    .from("circles")
                    .insert({
                        name: circleName,
                        artist,
                        day,
                        area,
                        block,
                        space_number,
                        map_url: priceListImages[0] || "",
                        image_urls: priceListImages.filter(img => img.trim() !== ""), // Save all images
                        x_url: xUrl
                    })
                    .select()
                    .single();

                if (circleError) throw circleError;
                circleId = circle.id;
            }

            // 2. Upsert Items
            if (initialData?.id) {
                await supabase.from("items").delete().eq("circle_id", initialData.id);
            }

            const itemsToInsert = items
                .filter((it: any) => it.name.trim() !== "")
                .map((it: any) => ({
                    circle_id: circleId,
                    name: it.name,
                    price: parseInt(it.price) || 0,
                    quantity: it.quantity || 0,
                    priority: it.priority || "Medium",
                    buyer: it.buyer || "",
                    is_wanted: it.isWanted || false,
                    tags: it.tags || []
                }));

            if (itemsToInsert.length === 0) {
                itemsToInsert.push({
                    circle_id: circleId,
                    name: "新刊/グッズ",
                    price: 0,
                    quantity: 1,
                    priority: "Medium",
                    buyer: "",
                    is_wanted: false,
                    tags: []
                });
            }

            const { error: itemsError } = await supabase
                .from("items")
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            if (initialData?.scraped_id) {
                await supabase
                    .from("scraped_posts")
                    .update({ is_read: true })
                    .eq("id", initialData.scraped_id);
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error("Save failed:", error);
            alert("Failed to save. Check console.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className={`${styles.modal} glass`}
            >
                <div className={styles.header}>
                    <h2>{step === 1 ? "Add Artist Info" : "Select Items to Buy"}</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className={styles.content}>
                    {step === 1 ? (
                        <div className={styles.formSection}>
                            <div className={styles.inputGroup}>
                                <label>X (Twitter) URL / Post Content</label>
                                <div className={styles.aiInputWrapper}>
                                    <input
                                        type="text"
                                        value={xUrl}
                                        onChange={(e) => setXUrl(e.target.value)}
                                        placeholder="Paste X post URL or text..."
                                        className="glass"
                                    />
                                    <button
                                        className={`${styles.aiBtn} ${loading ? styles.spinning : ""}`}
                                        onClick={handleFetch}
                                        disabled={loading || (!xUrl && !priceListImages[0])}
                                    >
                                        {loading ? <Loader2 size={18} /> : <Sparkles size={18} />}
                                    </button>
                                </div>
                                {retryTimer !== null && (
                                    <div className={styles.retryBadge}>
                                        <Loader2 size={12} className={styles.spinning} />
                                        <span>Quota exceeded. Please retry in {retryTimer}s</span>
                                    </div>
                                )}
                                <div className={styles.apiSettingsToggle}>
                                    <button onClick={() => setShowSettings(!showSettings)} className={styles.settingsLink}>
                                        <Settings2 size={14} />
                                        {showSettings ? "Hide AI Settings" : "AI Extraction Settings"}
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {showSettings && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className={styles.settingsPanel}
                                        >
                                            <div className={styles.settingField}>
                                                <label>AI Model</label>
                                                <select value={aiModel} onChange={(e: any) => setAiModel(e.target.value)} className="glass">
                                                    <option value="gpt-4o-mini">GPT-4o mini</option>
                                                    <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                                                </select>
                                            </div>
                                            <div className={styles.settingField}>
                                                <label>Extraction Method</label>
                                                <select value={ocrMethod} onChange={(e: any) => setOcrMethod(e.target.value)} className="glass">
                                                    <option value="combined">OCR Text + AI (Reliable)</option>
                                                    <option value="vision">Vision Direct (Smart)</option>
                                                </select>
                                            </div>
                                            <div className={styles.settingField}>
                                                <label>Extract Items (Menu)</label>
                                                <div className={styles.toggleWrapper}>
                                                    <input
                                                        type="checkbox"
                                                        checked={extractItems}
                                                        onChange={(e) => setExtractItems(e.target.checked)}
                                                        id="extractItemsToggle"
                                                    />
                                                    <label htmlFor="extractItemsToggle">Enable (Slower but detailed)</label>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className={styles.grid2}>
                                <div className={styles.inputGroup}>
                                    <label>Artist Name *</label>
                                    <input type="text" value={artist} onChange={(e) => setArtist(e.target.value)} className="glass" />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Circle Name</label>
                                    <input type="text" value={circleName} onChange={(e) => setCircleName(e.target.value)} className="glass" />
                                </div>
                            </div>

                            <div className={styles.grid2}>
                                <div className={styles.inputGroup}>
                                    <label>Day (C107)</label>
                                    <select value={day} onChange={(e) => setDay(e.target.value)} className="glass">
                                        <option value="1">1日目 - 12/30（火）</option>
                                        <option value="2">2日目 - 12/31（水）</option>
                                    </select>
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Location (e.g., 東1-ア-74a)</label>
                                    <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="glass" />
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
                                                onClick={() => { setLightboxImages([imgUrl]); setLightboxOpen(true); }}
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
                                                    <button className={styles.previewBtn} onClick={() => { setLightboxImages([imgUrl]); setLightboxOpen(true); }} title="Preview">
                                                        <ImageIcon size={14} />
                                                    </button>
                                                    <button className={styles.linkBtn} onClick={() => window.open(imgUrl, '_blank')} title="Open Layout">
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
                    ) : (
                        <div className={styles.itemsSection}>
                            {/* Fixed Header with Price List Preview if available */}
                            {/* Fixed Header with Price List Preview if available */}
                            {priceListImages.length > 0 && priceListImages[0] && (
                                <div className={styles.fixedPreview} onClick={() => { setLightboxImages(priceListImages); setLightboxOpen(true); }}>
                                    <div className={styles.fixedPreviewInner}>
                                        <img src={priceListImages[0]} alt="Reference" />
                                        <span className={styles.previewHint}>Tap to Zoom ({priceListImages.length})</span>
                                    </div>
                                </div>
                            )}

                            <div className={styles.itemsHeader}>
                                <h3>Items to Purchase</h3>
                                <button className={styles.addItemBtn} onClick={addItem}>
                                    <Plus size={16} /> Add
                                </button>
                            </div>

                            <div className={styles.itemsScrollContainer}>
                                <div className={styles.itemsList}>
                                    {items.map((item, index) => (
                                        <div className={`${styles.itemRow} glass`}>
                                            <div className={styles.itemMainRow}>
                                                <input
                                                    type="checkbox"
                                                    checked={item.isWanted}
                                                    onChange={(e) => handleItemChange(index, "isWanted", e.target.checked)}
                                                    className={styles.itemCheck}
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Item Name"
                                                    value={item.name}
                                                    onChange={(e) => handleItemChange(index, "name", e.target.value)}
                                                    className={styles.itemNameInput}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="¥"
                                                    value={item.price}
                                                    onChange={(e) => handleItemChange(index, "price", e.target.value)}
                                                    className={styles.itemPriceInput}
                                                />
                                                <div className={styles.qtyWrapper}>
                                                    <input
                                                        type="number"
                                                        placeholder="Qty"
                                                        min="0"
                                                        value={item.quantity || 0}
                                                        onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value))}
                                                        className={styles.itemQtyInput}
                                                    />
                                                </div>
                                                <div className={styles.priorityWrapper}>
                                                    <select
                                                        value={item.priority}
                                                        onChange={(e) => handleItemChange(index, "priority", e.target.value)}
                                                        className={styles.itemPrioritySelect}
                                                    >
                                                        <option value="High">高</option>
                                                        <option value="Medium">中</option>
                                                        <option value="Low">低</option>
                                                    </select>
                                                </div>
                                                <div className={styles.assignWrapper}>
                                                    <select
                                                        value={item.buyer}
                                                        onChange={(e) => handleItemChange(index, "buyer", e.target.value)}
                                                        className={styles.itemBuyerSelect}
                                                    >
                                                        <option value="">Assign...</option>
                                                        {globalSettings?.buyerList?.map((b: string) => (
                                                            <option key={b} value={b}>{b}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <button className={styles.removeBtn} onClick={() => removeItem(index)}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            <div className={styles.tagContainer}>
                                                <div className={styles.colorSelector}>
                                                    {['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#6b7280'].map(c => (
                                                        <div
                                                            key={c}
                                                            className={`${styles.colorDot} ${(item.tags || []).includes(c) ? styles.active : ""}`}
                                                            style={{ backgroundColor: c, color: c }}
                                                            onClick={() => toggleTag(index, c)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    {step === 2 && (
                        <button className={styles.backBtn} onClick={() => setStep(1)} disabled={loading}>
                            <ChevronLeft size={16} /> Artist Info
                        </button>
                    )}
                    <button className={styles.cancelBtn} onClick={onClose} disabled={loading}>
                        Cancel
                    </button>
                    <button className={styles.submitBtn} onClick={handleSubmit} disabled={loading}>
                        {loading ? <Loader2 className={styles.spinning} /> : step === 1 ? "Next: Set Items" : "Save Artist"}
                    </button>
                </div>

                <ImageLightbox
                    isOpen={lightboxOpen}
                    imageUrls={lightboxImages}
                    onClose={() => setLightboxOpen(false)}
                />
            </motion.div>
        </div>
    );
}
