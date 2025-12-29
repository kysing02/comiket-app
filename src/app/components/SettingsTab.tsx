import React from "react";
import { Plus, Trash2 } from "lucide-react";
import styles from "../page.module.css";

interface SettingsTabProps {
    appSettings: {
        aiModel: string;
        ocrMethod: string;
        defaultBuyer: string;
        buyerList: string[];
    };
    updateSetting: (key: string, value: any) => void;
    dbBuyers: any[];
    addBuyer: () => void;
    removeBuyer: (id: string) => void;
    updateBuyerName: (id: string, name: string) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
    appSettings,
    updateSetting,
    dbBuyers,
    addBuyer,
    removeBuyer,
    updateBuyerName,
}) => {
    return (
        <div className={styles.settingsArea}>
            <h2 className={styles.sectionTitle}>App Settings</h2>

            <div className={`${styles.settingsGroup} glass`}>
                <h3>AI & OCR Configuration</h3>
                <div className={styles.settingItem}>
                    <label>AI Model</label>
                    <select
                        value={appSettings.aiModel}
                        onChange={(e) => updateSetting("aiModel", e.target.value)}
                        className="glass"
                    >
                        <option value="gpt-4o-mini">GPT-4o mini (Current)</option>
                        <option value="gemini-3-flash-preview">Gemini 3.0 Flash Preview</option>
                    </select>
                </div>
                <div className={styles.settingItem}>
                    <label>OCR Method</label>
                    <select
                        value={appSettings.ocrMethod}
                        onChange={(e) => updateSetting("ocrMethod", e.target.value)}
                        className="glass"
                    >
                        <option value="combined">Tesseract + AI (Recommended)</option>
                        <option value="vision">Vision Only (Fastest)</option>
                        <option value="tesseract">Tesseract Only (Local)</option>
                    </select>
                </div>
            </div>

            <div className={`${styles.settingsGroup} glass`}>
                <div className={styles.groupHeader}>
                    <h3>Buyer Management</h3>
                    <button className={styles.iconBtnSmall} onClick={addBuyer}>
                        <Plus size={16} /> Add
                    </button>
                </div>
                <div className={styles.buyerList}>
                    {dbBuyers.map((buyer) => (
                        <div key={buyer.id} className={styles.buyerRow}>
                            <input
                                type="text"
                                value={buyer.name}
                                onChange={(e) => updateBuyerName(buyer.id, e.target.value)}
                                className={styles.buyerInput}
                            />
                            <button className={styles.removeBtn} onClick={() => removeBuyer(buyer.id)}>
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
                <div className={styles.settingItem}>
                    <label>Default Buyer (Auto-fill)</label>
                    <select
                        value={appSettings.defaultBuyer}
                        onChange={(e) => updateSetting("defaultBuyer", e.target.value)}
                        className="glass"
                    >
                        <option value="">None (Select manually)</option>
                        {dbBuyers.map(b => (
                            <option key={b.id} value={b.name}>{b.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className={styles.settingsFooter}>
                <p>Comiket C107 Tracker v0.5.1</p>
                <p>All data is synced to Supabase</p>
            </div>
        </div>
    );
};
