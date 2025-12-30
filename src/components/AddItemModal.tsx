"use client";

import { X, Loader2, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import styles from "./AddItemModal.module.css";
import ImageLightbox from "./ImageLightbox";
import { ArtistInfoForm } from "./AddItemModal/components/ArtistInfoForm";
import { ItemListSection } from "./AddItemModal/components/ItemListSection";
import { AIInputSection } from "./AddItemModal/components/AIInputSection";
import { ConfirmModal } from "./ConfirmModal";
import { useAddItemModal } from "@/hooks/useAddItemModal";

interface AddItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
    globalSettings?: any;
    dbBuyers?: any[];
    initialStep?: 1 | 2;
}

export default function AddItemModal(props: AddItemModalProps) {
    const { isOpen, onClose, dbBuyers } = props;
    const {
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
        retryTimer,
        confirmOpen,
        setConfirmOpen,
        handleFetch,
        addPriceListImage,
        addItem,
        requestRemoveItem,
        confirmRemoveItem,
        handleItemChange,
        toggleBuyer,
        toggleTag,
        handleSubmit
    } = useAddItemModal(props);

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
                            <AIInputSection
                                xUrl={xUrl}
                                setXUrl={setXUrl}
                                loading={loading}
                                handleFetch={handleFetch}
                                priceListImages={priceListImages}
                                retryTimer={retryTimer}
                                showSettings={showSettings}
                                setShowSettings={setShowSettings}
                                aiModel={aiModel}
                                setAiModel={setAiModel}
                                ocrMethod={ocrMethod}
                                setOcrMethod={setOcrMethod}
                                extractItems={extractItems}
                                setExtractItems={setExtractItems}
                            />

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
