"use client";

import { useState } from "react";
import { X, Loader2, Plus, Trash2, Link as LinkIcon, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./AddItemModal.module.css";
import { supabase } from "@/lib/supabase";
import { extractComiketData } from "@/lib/ai";

interface AddItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddItemModal({ isOpen, onClose, onSuccess }: AddItemModalProps) {
    const [loading, setLoading] = useState(false);
    const [xUrl, setXUrl] = useState("");

    // Form State
    const [circleName, setCircleName] = useState("");
    const [artist, setArtist] = useState("");
    const [day, setDay] = useState("1");
    const [location, setLocation] = useState("");
    const [items, setItems] = useState([{ name: "", price: "" }]);

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
            const space = data.circle?.space || "";
            setLocation(`${area}${block}-${space}`.replace(/^-|-$/, ""));
            setItems((data.items || []).map((it: any) => ({ name: it.name, price: it.price?.toString() || "0" })));
        } catch (error) {
            console.error("Failed to fetch data:", error);
            alert("Failed to extract data from URL. Please enter manually.");
        } finally {
            setLoading(false);
        }
    };

    const addItem = () => {
        setItems([...items, { name: "", price: "" }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: "name" | "price", value: string) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // 1. Insert Circle
            const { data: circle, error: circleError } = await supabase
                .from("circles")
                .insert({
                    name: circleName,
                    artist,
                    day,
                    space_number: location, // Simplified for now
                })
                .select()
                .single();

            if (circleError) throw circleError;

            // 2. Insert Items
            const itemsToInsert = items
                .filter((it: any) => it.name)
                .map((it: any) => ({
                    circle_id: circle.id,
                    name: it.name,
                    price: parseInt(it.price) || 0,
                }));

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
        <AnimatePresence>
            <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className={`${styles.modal} glass`}
                >
                    <div className={styles.header}>
                        <h2>Add New Circle</h2>
                        <button className={styles.closeBtn} onClick={onClose}>
                            <X size={24} />
                        </button>
                    </div>

                    {/* AI Fetch Section */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Paste X (Twitter) URL</label>
                        <div className={styles.fetchSection}>
                            <input
                                type="text"
                                className={`${styles.input} ${styles.fetchInput}`}
                                placeholder="https://x.com/artist/status/..."
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
                    </div>

                    <hr className={styles.divider} />

                    {/* Manual Form */}
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Circle Name</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={circleName}
                                onChange={(e) => setCircleName(e.target.value)}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Artist</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={artist}
                                onChange={(e) => setArtist(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Day</label>
                            <select
                                className={styles.input}
                                value={day}
                                onChange={(e) => setDay(e.target.value)}
                            >
                                <option value="1">Day 1</option>
                                <option value="2">Day 2</option>
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Location (e.g. 東A-12b)</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Items</label>
                        <div className={styles.itemsList}>
                            {items.map((item, index) => (
                                <div key={`item-${index}-${item.name}`} className={styles.itemEntry}>
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
                                        placeholder="Price"
                                        value={item.price}
                                        onChange={(e) => handleItemChange(index, "price", e.target.value)}
                                    />
                                    <button className={styles.removeBtn} onClick={() => removeItem(index)}>
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button className={styles.addItemBtn} onClick={addItem}>
                            <Plus size={16} /> Add Another Item
                        </button>
                    </div>

                    <div className={styles.footer}>
                        <button
                            className={styles.primaryBtn}
                            onClick={handleSubmit}
                            disabled={loading || !circleName}
                        >
                            {loading ? "Saving..." : "Save to My List"}
                        </button>
                    </div>
                </motion.div>
            </div>

            <style jsx>{`
        .divider {
          border: 0;
          border-top: 1px solid var(--glass-border);
          margin: 0;
        }
      `}</style>
        </AnimatePresence>
    );
}
