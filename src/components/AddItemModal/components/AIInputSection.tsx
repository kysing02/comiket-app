import { Loader2, Sparkles, Settings2 } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { AISettings } from "./AISettings";
import styles from "../../AddItemModal.module.css";

interface AIInputSectionProps {
    xUrl: string;
    setXUrl: (val: string) => void;
    loading: boolean;
    handleFetch: () => void;
    priceListImages: string[];
    retryTimer: number | null;
    showSettings: boolean;
    setShowSettings: (val: boolean) => void;
    aiModel: any;
    setAiModel: (val: any) => void;
    ocrMethod: any;
    setOcrMethod: (val: any) => void;
    extractItems: boolean;
    setExtractItems: (val: boolean) => void;
}

export function AIInputSection({
    xUrl,
    setXUrl,
    loading,
    handleFetch,
    priceListImages,
    retryTimer,
    showSettings,
    setShowSettings,
    aiModel,
    setAiModel,
    ocrMethod,
    setOcrMethod,
    extractItems,
    setExtractItems
}: AIInputSectionProps) {
    return (
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
    );
}
