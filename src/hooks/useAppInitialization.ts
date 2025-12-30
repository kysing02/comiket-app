"use client";

import { useState, useEffect } from "react";

export interface AppSettings {
    aiModel: string;
    ocrMethod: string;
    defaultBuyer: string;
    buyerList: string[];
}

const DEFAULT_SETTINGS: AppSettings = {
    aiModel: "gemini-3-flash-preview",
    ocrMethod: "vision",
    defaultBuyer: "",
    buyerList: ["Me", "Friend A", "Friend B"]
};

export function useAppInitialization() {
    const [activeTab, setActiveTabState] = useState("feed");
    const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isOffline, setIsOffline] = useState(false);

    // Initialize from LocalStorage
    useEffect(() => {
        if (typeof window === "undefined") return;

        // Load Tab
        const savedTab = localStorage.getItem("activeTab");
        if (savedTab) setActiveTabState(savedTab);

        // Load Settings
        const savedSettings = localStorage.getItem("comiket_settings");
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                if (!parsed.buyerList || !Array.isArray(parsed.buyerList)) {
                    parsed.buyerList = DEFAULT_SETTINGS.buyerList;
                }
                setAppSettings(parsed);
            } catch (e) {
                console.error("Failed to parse settings", e);
            }
        }

        // PWA / Offline logic
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        const handleOffline = () => setIsOffline(true);
        const handleOnline = () => setIsOffline(false);

        if (!navigator.onLine) setIsOffline(true);

        // Service Worker Update logic
        const handleControllerChange = () => {
            window.location.reload();
        };

        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
        }

        // Check for updates on focus
        const handleFocus = async () => {
            if ("serviceWorker" in navigator) {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    registration.update().catch(console.error);
                }
            }
        };
        window.addEventListener("focus", handleFocus);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("online", handleOnline);
            if ("serviceWorker" in navigator) {
                navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
            }
            window.removeEventListener("focus", handleFocus);
        };
    }, []);

    const setActiveTab = (tab: string) => {
        setActiveTabState(tab);
        if (typeof window !== "undefined") {
            localStorage.setItem("activeTab", tab);
        }
    };

    const updateSetting = (key: keyof AppSettings, value: any) => {
        const newSettings = { ...appSettings, [key]: value };
        setAppSettings(newSettings);
        localStorage.setItem("comiket_settings", JSON.stringify(newSettings));
    };

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            setDeferredPrompt(null);
        }
    };

    return {
        activeTab,
        setActiveTab,
        appSettings,
        updateSetting,
        deferredPrompt,
        isOffline,
        handleInstallClick
    };
}
