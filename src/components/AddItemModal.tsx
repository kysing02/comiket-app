"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Plus, Trash2, Link as LinkIcon, Sparkles, Settings2, ChevronLeft, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./AddItemModal.module.css";
import { supabase } from "@/lib/supabase";
import { performOCR } from "@/lib/ai";
import { standardizeLocation } from "@/lib/location";
import ImageLightbox from "./ImageLightbox";
import { AISettings } from "./AddItemModal/components/AISettings";
import { ArtistInfoForm } from "./AddItemModal/components/ArtistInfoForm";
import { ItemListSection } from "./AddItemModal/components/ItemListSection";
import { ConfirmModal } from "./ConfirmModal";

interface AddItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
    globalSettings?: any;
    dbBuyers?: any[];
    initialStep?: 1 | 2;
}

export default function AddItemModal({ isOpen, onClose, onSuccess, initialData, globalSettings, dbBuyers, initialStep }: AddItemModalProps) {
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
    const [items, setItems] = useState([{ id: Math.random().toString(), name: "", price: "", quantity: 0, priority: "Medium", buyerIds: [] as string[], isWanted: false, tags: [] as any[] }]);
    const [retryTimer, setRetryTimer] = useState<number | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Confirm Modal
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

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

                    // Smart Item Merge: If DB has items but draft doesn't (or draft has empty row), prefer DB
                    const dbItems = initialData.items && initialData.items.length > 0;
                    const draftHasItems = d.items && d.items.length > 0 && (d.items.length > 1 || d.items[0].name !== "");

                    if (dbItems && !draftHasItems) {
                        setItems(initialData.items.map((it: any) => ({
                            id: it.id || Math.random().toString(),
                            name: it.name,
                            price: it.price?.toString() || "0",
                            quantity: it.quantity || 0,
                            priority: it.priority || "Medium",
                            buyerIds: it.item_buyers?.length > 0
                                ? it.item_buyers.map((ib: any) => ib.buyer_id)
                                : it.buyer ? [dbBuyers?.find(b => b.name.trim().toLowerCase() === it.buyer.trim().toLowerCase())?.id].filter(Boolean) as string[] : [],
                            isWanted: it.is_wanted || false,
                            tags: it.tags || []
                        })));
                    } else {
                        setItems(d.items);
                    }
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
                        buyerIds: it.item_buyers?.length > 0
                            ? it.item_buyers.map((ib: any) => ib.buyer_id)
                            : it.buyer ? [dbBuyers?.find(b => b.name.trim().toLowerCase() === it.buyer.trim().toLowerCase())?.id].filter(Boolean) as string[] : [],
                        isWanted: it.is_wanted || false,
                        tags: it.tags || []
                    })));
                } else {
                    const defaultBuyerId = dbBuyers?.find(b => b.name === globalSettings?.defaultBuyer)?.id;
                    setItems([{ id: Math.random().toString(), name: "", price: "", quantity: 0, priority: "Medium", buyerIds: defaultBuyerId ? [defaultBuyerId] : [], isWanted: false, tags: [] }]);
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
                const defaultBuyerId = dbBuyers?.find(b => b.name === globalSettings?.defaultBuyer)?.id;
                setItems([{ id: Math.random().toString(), name: "", price: "", quantity: 0, priority: "Medium", buyerIds: defaultBuyerId ? [defaultBuyerId] : [], isWanted: false, tags: [] }]);
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

            // Prefer formatted_location from AI if it exists
            if (data.circle?.formatted_location) {
                setLocation(data.circle.formatted_location);
            } else {
                const area = data.circle?.area || "";
                const block = data.circle?.block || "";
                const sn = data.circle?.space_number || "";
                setLocation(standardizeLocation(area, block, sn));
            }

            if (data.items && data.items.length > 0) {
                setItems(data.items.map((it: any) => ({
                    id: Math.random().toString(),
                    name: it.name,
                    price: it.price?.toString() || "0",
                    quantity: 0,
                    priority: it.priority || "Medium",
                    buyerIds: [],
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
        const defaultBuyerId = dbBuyers?.find(b => b.name === globalSettings?.defaultBuyer)?.id;
        setItems([...items, { id: Math.random().toString(), name: "", price: "", quantity: 0, priority: "Medium", buyerIds: defaultBuyerId ? [defaultBuyerId] : [], isWanted: false, tags: [] }]);
    };

    const requestRemoveItem = (index: number) => {
        setDeleteIndex(index);
        setConfirmOpen(true);
    };

    const confirmRemoveItem = () => {
        if (deleteIndex !== null) {
            setItems(items.filter((_, i) => i !== deleteIndex));
            setDeleteIndex(null);
        }
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        (newItems[index] as any)[field] = value;
        setItems(newItems);
    };

    const toggleBuyer = (itemIndex: number, buyerId: string) => {
        const newItems = [...items];
        const currentBuyers = newItems[itemIndex].buyerIds || [];
        if (currentBuyers.includes(buyerId)) {
            newItems[itemIndex].buyerIds = currentBuyers.filter((id: string) => id !== buyerId);
        } else {
            newItems[itemIndex].buyerIds = [...currentBuyers, buyerId];
        }
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
            const formatted_location = standardizeLocation("", "", location);

            const locMatch = location.match(/^(東|西|南|East|West)?([A-Z])?-?(.*)/i);
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
                        formatted_location,
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
                        formatted_location,
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
                    is_wanted: it.isWanted || false,
                    tags: it.tags || [],
                    buyer: (it.buyerIds && it.buyerIds.length > 0)
                        ? dbBuyers?.find(b => b.id === it.buyerIds[0])?.name || ""
                        : ""
                }));

            if (itemsToInsert.length === 0) {
                itemsToInsert.push({
                    circle_id: circleId,
                    name: "新刊/グッズ",
                    price: 0,
                    quantity: 1,
                    priority: "Medium",
                    is_wanted: false,
                    tags: [],
                    buyer: ""
                });
            }

            const { data: insertedItems, error: itemsError } = await supabase
                .from("items")
                .insert(itemsToInsert)
                .select();

            if (itemsError) throw itemsError;

            // 3. Upsert item_buyers
            const itemBuyersToInsert: any[] = [];
            insertedItems.forEach((insertedItem, idx) => {
                const originalItem = items.filter(it => it.name.trim() !== "")[idx] || (itemsToInsert.length === 1 ? items[0] : null);
                // Condition 1: Only save if quantity > 0
                if (originalItem && originalItem.quantity > 0 && originalItem.buyerIds && originalItem.buyerIds.length > 0) {
                    originalItem.buyerIds.forEach((bId: string) => {
                        itemBuyersToInsert.push({
                            item_id: insertedItem.id,
                            buyer_id: bId
                        });
                    });
                }
            });

            if (itemBuyersToInsert.length > 0) {
                const { error: ibError } = await supabase
                    .from("item_buyers")
                    .insert(itemBuyersToInsert);
                if (ibError) throw ibError;
            }

            if (initialData?.scraped_id) {
                await supabase
                    .from("scraped_posts")
                    .update({ is_read: true })
                    .eq("id", initialData.scraped_id);
                localStorage.removeItem(`draft_scraped_${initialData.scraped_id}`);
            } else if (initialData?.id) {
                localStorage.removeItem(`draft_edit_${initialData.id}`);
            } else {
                localStorage.removeItem("draft_manual");
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
                                    <AISettings
                                        showSettings={showSettings}
                                        aiModel={aiModel}
                                        setAiModel={setAiModel}
                                        ocrMethod={ocrMethod}
                                        setOcrMethod={setOcrMethod}
                                        extractItems={extractItems}
                                        setExtractItems={setExtractItems}
                                    />
                                </AnimatePresence>
                            </div>

                            <ArtistInfoForm
                                artist={artist}
                                setArtist={setArtist}
                                circleName={circleName}
                                setCircleName={setCircleName}
                                day={day}
                                setDay={setDay}
                                location={location}
                                setLocation={setLocation}
                                priceListImages={priceListImages}
                                setPriceListImages={setPriceListImages}
                                addPriceListImage={addPriceListImage}
                                setLightboxOpen={setLightboxOpen}
                                setLightboxImages={setLightboxImages}
                            />
                        </div>
                    ) : (
                        <ItemListSection
                            items={items}
                            priceListImages={priceListImages}
                            dbBuyers={dbBuyers || []}
                            onItemChange={handleItemChange}
                            onRemoveItem={requestRemoveItem}
                            onToggleBuyer={toggleBuyer}
                            onToggleTag={toggleTag}
                            onAddItem={addItem}
                            setLightboxOpen={setLightboxOpen}
                            setLightboxImages={setLightboxImages}
                        />
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

            <ConfirmModal
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={confirmRemoveItem}
                title="Remove Item"
                message="Are you sure you want to remove this item from the list?"
                isDanger={true}
                confirmText="Remove"
            />
        </div>
    );
}
