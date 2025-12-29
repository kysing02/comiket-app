import React from "react";
import { motion } from "framer-motion";
import styles from "../../AddItemModal.module.css";

interface AISettingsProps {
    showSettings: boolean;
    aiModel: string;
    setAiModel: (model: string) => void;
    ocrMethod: string;
    setOcrMethod: (method: string) => void;
    extractItems: boolean;
    setExtractItems: (extract: boolean) => void;
}

export const AISettings: React.FC<AISettingsProps> = ({
    showSettings,
    aiModel,
    setAiModel,
    ocrMethod,
    setOcrMethod,
    extractItems,
    setExtractItems,
}) => {
    if (!showSettings) return null;

    return (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={styles.settingsPanel}
        >
            <div className={styles.settingField}>
                <label>AI Model</label>
                <select
                    value={aiModel}
                    onChange={(e: any) => setAiModel(e.target.value)}
                    className="glass"
                >
                    <option value="gpt-4o-mini">GPT-4o mini</option>
                    <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                </select>
            </div>
            <div className={styles.settingField}>
                <label>Extraction Method</label>
                <select
                    value={ocrMethod}
                    onChange={(e: any) => setOcrMethod(e.target.value)}
                    className="glass"
                >
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
    );
};
