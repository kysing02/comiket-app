import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { performOCR } from "@/lib/ai";
import { standardizeLocation } from "@/lib/location";
import { logger } from "@/lib/logger";

interface UseAddItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
    globalSettings?: any;
    dbBuyers?: any[];
    initialStep?: 1 | 2;
}

export function useAddItemModal({
    isOpen,
    onClose,
    onSuccess,
    initialData,
    globalSettings,
    dbBuyers,
    initialStep
}: UseAddItemModalProps) {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<1 | 2>(initialStep || 1);
    const [xUrl, setXUrl] = useState("");
    const [priceListImages, setPriceListImages] = useState<string[]>([""]);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxImages, setLightboxImages] = useState<string[]>([]);

    // AI & Settings State
    const [aiModel, setAiModel] = useState<any>(globalSettings?.aiModel || "gemini-3-flash-preview");
    const [ocrMethod, setOcrMethod] = useState<any>(globalSettings?.ocrMethod || "vision");
    const [extractItems, setExtractItems] = useState(true);
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
            setConfirmOpen(false);
            setDeleteIndex(null);
            setShowSettings(false);
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
                    setPriceListImages(d.priceListImages && d.priceListImages.length > 0 ? d.priceListImages : [initialData.map_url || ""]);
                    setXUrl(d.xUrl || initialData.x_url || "");

                    const dbItemsExist = initialData.items && initialData.items.length > 0;
                    const draftHasItems = d.items && d.items.length > 0 && (d.items.length > 1 || d.items[0].name !== "");

                    if (dbItemsExist && !draftHasItems) {
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
                    logger.app("Draft parse error", e, 'ERROR');
                }
            } else {
                setCircleName(initialData.name || "");
                setArtist(initialData.artist || "");
                setDay(initialData.day || "1");
                setLocation(`${initialData.area || ""}${initialData.block || ""}-${initialData.space_number || ""}`.replace(/^-|-$/, ""));

                if (initialData.scraped_id) {
                    setPriceListImages(initialData.image_urls && initialData.image_urls.length > 0 ? [initialData.image_urls[0]] : [initialData.map_url || ""]);
                } else {
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
            const savedDraft = localStorage.getItem("draft_manual");
            if (savedDraft) {
                try {
                    const d = JSON.parse(savedDraft);
                    setCircleName(d.circleName);
                    setArtist(d.artist);
                    setDay(d.day);
                    setLocation(d.location);
                    setPriceListImages(d.priceListImages || [""]);
                    setXUrl(d.xUrl);
                    setItems(d.items);
                } catch (e) {
                    logger.app("Draft parse error", e, 'ERROR');
                }
            } else {
                setCircleName("");
                setArtist("");
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

    // Auto-populate when extraction status becomes 'ready'
    useEffect(() => {
        if (isOpen && initialData?.extraction_status === 'ready' && initialData.extracted_data && !circleName) {
            const data = initialData.extracted_data;
            setCircleName(data.circle?.name || "");
            setArtist(data.circle?.artist || "");
            setDay(data.circle?.day || "1");

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
        }
    }, [isOpen, initialData?.extraction_status, initialData?.extracted_data]);

    const handleCancel = async () => {
        if (initialData?.scraped_id && initialData?.extraction_status === 'processing') {
            // If we cancel while it's processing, we might want to tell the server.
            // For now, let's just mark it as pending so it can be retried or ignored.
            await supabase.from('scraped_posts').update({ extraction_status: 'pending' }).eq('id', initialData.scraped_id);
        }
        onClose();
    };

    const handleFetch = async () => {
        const validImages = priceListImages.filter(img => img.trim() !== "");
        if (!xUrl && validImages.length === 0) return;
        setLoading(true);
        try {
            if (initialData?.scraped_id) {
                await supabase.from('scraped_posts').update({ extraction_status: 'processing' }).eq('id', initialData.scraped_id);
            }
            let contextText = initialData?.scrapedContent || xUrl;
            const imageUrls = validImages.length > 0 ? validImages : (initialData?.image_urls || []);

            if (ocrMethod === "combined" && imageUrls.length > 0) {
                const ocrResult = await performOCR(imageUrls[0]);
                contextText += `\n\n[OCR Text from Image]:\n${ocrResult}`;
            }

            const response = await fetch("/api/extract", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    postText: contextText,
                    imageUrls: ocrMethod === "vision" ? imageUrls : [],
                    model: aiModel,
                    includeItems: extractItems,
                    authorName: artist || initialData?.username
                }),
            });

            const data = await response.json();
            if (response.ok) {
                if (initialData?.scraped_id) {
                    await supabase.from('scraped_posts').update({
                        extraction_status: 'ready',
                        extracted_data: data
                    }).eq('id', initialData.scraped_id);
                }
                setCircleName(data.circle?.name || "");
                setArtist(data.circle?.artist || "");
                setDay(data.circle?.day || "1");

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
            } else {
                if (data.error === "QUOTA_EXCEEDED") {
                    setRetryTimer(60);
                } else {
                    throw new Error(data.error || "Extraction failed");
                }
            }
        } catch (error: any) {
            if (initialData?.scraped_id) {
                await supabase.from('scraped_posts').update({ extraction_status: 'error' }).eq('id', initialData.scraped_id);
            }
            logger.api("AI Extraction failed", error, 'ERROR');
            alert(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const addPriceListImage = () => {
        if (initialData?.image_urls && initialData.image_urls.length > 0) {
            const nextImg = initialData.image_urls.find((url: string) => !priceListImages.includes(url));
            if (nextImg) {
                setPriceListImages([...priceListImages, nextImg]);
                return;
            }
        }
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
            setConfirmOpen(false);
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
                        image_urls: priceListImages.filter(img => img.trim() !== ""),
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
                        image_urls: priceListImages.filter(img => img.trim() !== ""),
                        x_url: xUrl
                    })
                    .select()
                    .single();

                if (circleError) throw circleError;
                circleId = circle.id;
            }

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

            const itemBuyersToInsert: any[] = [];
            insertedItems.forEach((insertedItem, idx) => {
                const originalItem = items.filter(it => it.name.trim() !== "")[idx] || (itemsToInsert.length === 1 ? items[0] : null);
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
            logger.db("Save failed", error, 'ERROR');
            alert("Failed to save. Check console.");
        } finally {
            setLoading(false);
        }
    };

    return {
        // State
        loading,
        step,
        setStep,
        xUrl,
        setXUrl,
        priceListImages,
        setPriceListImages,
        lightboxOpen,
        setLightboxOpen,
        lightboxImages,
        setLightboxImages,
        aiModel,
        setAiModel,
        ocrMethod,
        setOcrMethod,
        extractItems,
        setExtractItems,
        showSettings,
        setShowSettings,
        circleName,
        setCircleName,
        artist,
        setArtist,
        day,
        setDay,
        location,
        setLocation,
        items,
        setItems,
        retryTimer,
        confirmOpen,
        setConfirmOpen,

        // Functions
        handleFetch,
        addPriceListImage,
        addItem,
        requestRemoveItem,
        confirmRemoveItem,
        handleItemChange,
        toggleBuyer,
        toggleTag,
        handleSubmit,
        handleCancel,
        extractionStatus: initialData?.extraction_status
    };
}
