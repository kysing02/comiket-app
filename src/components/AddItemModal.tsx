"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Plus, Trash2, Link as LinkIcon, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./AddItemModal.module.css";
import { supabase } from "@/lib/supabase";
import { extractComiketData } from "@/lib/ai";

interface AddItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}

export default function AddItemModal({ isOpen, onClose, onSuccess, initialData }: AddItemModalProps) {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<1 | 2>(1);
    const [xUrl, setXUrl] = useState("");
    const [priceListImage, setPriceListImage] = useState("");

    // Form State
    const [circleName, setCircleName] = useState("");
    const [artist, setArtist] = useState("");
    const [day, setDay] = useState("1");
    const [location, setLocation] = useState("");
    const [items, setItems] = useState([{ id: Math.random().toString(), name: "", price: "", priority: "Medium", isWanted: false }]);

    useEffect(() => {
        if (initialData) {
            setCircleName(initialData.name || "");
            setArtist(initialData.artist || "");
            setDay(initialData.day || "1");
            setLocation(`${initialData.area || ""}${initialData.block || ""}-${initialData.space_number || ""}`.replace(/^-|-$/, ""));
            setPriceListImage(initialData.map_url || "");
            setXUrl(initialData.x_url || "");
            if (initialData.items && initialData.items.length > 0) {
                setItems(initialData.items.map((it: any) => ({
                    id: it.id || Math.random().toString(),
                    name: it.name,
                    price: it.price?.toString() || "0",
                    priority: it.priority || "Medium",
                    isWanted: it.is_wanted || false
                })));
            }
        } else {
            // Reset for new entry
            setCircleName("");
            setArtist("");
            setDay("1");
            setLocation("");
            setPriceListImage("");
            setXUrl("");
            setItems([{ id: Math.random().toString(), name: "", price: "", priority: "Medium", isWanted: false }]);
        }
    }, [initialData, isOpen]);

    const handleFetch = async () => {
        if (!xUrl) return;
        setLoading(true);
        try {
            const response = await fetch("/api/extract", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postText: xUrl, imageUrls: [] }),
            });

            if (!response.ok) throw new Error("API Route failed");

            const data = await response.json();

            setCircleName(data.circle?.name || "");
            setArtist(data.circle?.artist || "");
            setDay(data.circle?.day || "1");
            const area = data.circle?.area || "";
            const block = data.circle?.block || "";
            const sn = data.circle?.space_number || "";
            setLocation(`${area}${block}-${sn}`.replace(/^-|-$/, ""));

            // If the input was a URL, let's assume it's the price list image if it looks like one
            if (xUrl.includes("photo/1") || xUrl.includes("pbs.twimg.com")) {
                setPriceListImage(xUrl);
            }

            setItems((data.items || []).map((it: any) => ({
                id: Math.random().toString(),
                name: it.name,
                price: it.price?.toString() || "0",
                priority: it.priority || "Medium",
                isWanted: false
            })));
        } catch (error) {
            console.error("Failed to fetch data:", error);
            alert("Failed to extract data. Please enter manually.");
        } finally {
            setLoading(false);
        }
    };

    const addItem = () => {
        setItems([...items, { id: Math.random().toString(), name: "", price: "", priority: "Medium", isWanted: false }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        (newItems[index] as any)[field] = value;
        setItems(newItems);
    };

    const handleSubmit = async () => {
        if (step === 1) {
            if (!artist) {
                alert("Artist name is required.");
                return;
            }
            if (!priceListImage && !xUrl.includes("http")) {
                alert("Price list image or URL is required.");
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
                        map_url: priceListImage,
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
                        map_url: priceListImage,
                        x_url: xUrl
                    })
                    .select()
                    .single();

                if (circleError) throw circleError;
                circleId = circle.id;
            }

            // 2. Upsert Items
            // If editing, we might want to delete old items or update them.
            // For simplicity, let's delete items for this circle and re-insert if editing.
            if (initialData?.id) {
                await supabase.from("items").delete().eq("circle_id", initialData.id);
            }

            const itemsToInsert = items
                .filter((it: any) => it.name.trim() !== "")
                .map((it: any) => ({
                    circle_id: circleId,
                    name: it.name,
                    price: parseInt(it.price) || 0,
                    priority: it.priority || "Medium",
                    is_wanted: it.isWanted || false,
                }));

            // Final fallback if empty
            if (itemsToInsert.length === 0) {
                itemsToInsert.push({
                    circle_id: circleId,
                    name: "新刊/グッズ",
                    price: 0,
                    priority: "Medium",
                    is_wanted: false
                });
            }

            const { error: itemsError } = await supabase
                .from("items")
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

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
                <style jsx>{`
                    .divider {
                        border: 0;
                        border-top: 1px solid var(--glass-border);
                        margin: 0;
                    }
                `}</style>
                <div className={styles.header}>
                    <h2>{step === 1 ? "Add Artist Info" : "Select Items to Buy"}</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {step === 1 ? (
                    <>
                        {/* AI Fetch Section */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Paste X URL or Post Text</label>
                            <div className={styles.fetchSection}>
                                <input
                                    type="text"
                                    className={`${styles.input} ${styles.fetchInput}`}
                                    placeholder="https://x.com/..."
                                    value={xUrl}
                                    onChange={(e) => setXUrl(e.target.value)}
                                />
                                <button
                                    className={styles.secondaryBtn}
                                    onClick={handleFetch}
                                    disabled={loading || !xUrl}
                                >
                                    {loading ? <Loader2 className={styles.spinner} size={18} /> : <Sparkles size={18} />}
                                </button>
                            </div>
                            <p className={styles.hint}>Tip: Use the Chrome Extension to auto-fill!</p>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Price List Image URL <span className={styles.required}>*</span></label>
                            <input
                                type="text"
                                className={styles.input}
                                placeholder="https://pbs.twimg.com/media/..."
                                value={priceListImage}
                                onChange={(e) => setPriceListImage(e.target.value)}
                            />
                        </div>

                        {priceListImage && (
                            <div className={styles.imagePreviewContainer}>
                                <img src={priceListImage} alt="Price List" className={styles.priceListImage} />
                            </div>
                        )}

                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Artist <span className={styles.required}>*</span></label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={artist}
                                    onChange={(e) => setArtist(e.target.value)}
                                    placeholder="Required"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Circle Name</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={circleName}
                                    onChange={(e) => setCircleName(e.target.value)}
                                    placeholder="Optional"
                                />
                            </div>
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Day</label>
                                <select className={styles.input} value={day} onChange={(e) => setDay(e.target.value)}>
                                    <option value="1">Day 1</option>
                                    <option value="2">Day 2</option>
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Location</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="e.g. 東A-12b"
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Catalog (Item List)</label>
                            <div className={styles.itemsList}>
                                {items.map((item, index) => (
                                    <div key={item.id} className={styles.itemEntry}>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            placeholder="Item Name"
                                            value={item.name}
                                            onChange={(e) => handleItemChange(index, "name", e.target.value)}
                                        />
                                        <input
                                            type="number"
                                            className={styles.input}
                                            placeholder="¥"
                                            value={item.price}
                                            onChange={(e) => handleItemChange(index, "price", e.target.value)}
                                            style={{ width: '80px' }}
                                        />
                                        <button className={styles.removeBtn} onClick={() => removeItem(index)}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button className={styles.addItemBtn} onClick={addItem}>
                                <Plus size={16} /> Add Catalog Item
                            </button>
                        </div>
                    </>
                ) : (
                    <div className={styles.selectionMode}>
                        <p className={styles.selectionHint}>Check items you want to buy:</p>
                        <div className={styles.purchaseList}>
                            {items.filter(it => it.name.trim()).map((item, index) => (
                                <div key={item.id} className={styles.purchaseEntry} onClick={() => handleItemChange(items.indexOf(item), "isWanted", !item.isWanted)}>
                                    <div className={`${styles.checkControl} ${item.isWanted ? styles.checked : ""}`}>
                                        {item.isWanted && <Sparkles size={14} />}
                                    </div>
                                    <div className={styles.purchaseDetails}>
                                        <span className={styles.purchaseName}>{item.name}</span>
                                        <span className={styles.purchasePrice}>¥{item.price}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className={styles.backBtn} onClick={() => setStep(1)}>
                            Back to Artist Info
                        </button>
                    </div>
                )}

                <div className={styles.footer}>
                    <button
                        className={styles.primaryBtn}
                        onClick={handleSubmit}
                        disabled={loading || (step === 1 && !artist)}
                    >
                        {loading ? "Processing..." : step === 1 ? "Next: Purchase Info" : "Save to My List"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
