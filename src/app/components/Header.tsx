import { WifiOff, Download, Settings, RefreshCcw } from "lucide-react";
import styles from "../page.module.css";

interface HeaderProps {
    isOffline: boolean;
    deferredPrompt: any;
    handleInstallClick: () => void;
    onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    isOffline,
    deferredPrompt,
    handleInstallClick,
    onOpenSettings,
}) => {
    return (
        <header className={`${styles.header} glass`}>
            <div className={styles.headerContent}>
                <h1>C107 <span className={styles.textGradient}>Tracker</span></h1>
                <div className={styles.headerActions}>
                    {isOffline && (
                        <div className={styles.offlineBadge} title="Offline Mode">
                            <WifiOff size={16} />
                        </div>
                    )}
                    {deferredPrompt && (
                        <button className={`${styles.iconBtn} ${styles.installBtn}`} onClick={handleInstallClick}>
                            <Download size={20} />
                        </button>
                    )}
                    <button className={styles.iconBtn} onClick={() => window.location.reload()} title="Refresh App">
                        <RefreshCcw size={20} />
                    </button>
                    <button className={styles.iconBtn} onClick={onOpenSettings}>
                        <Settings size={20} />
                    </button>
                </div>
            </div>
        </header>
    );
};
