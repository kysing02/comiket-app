"use client";

import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import styles from "./ImageLightbox.module.css";

interface ImageLightboxProps {
    isOpen: boolean;
    imageUrls: string[]; // Changed to array
    initialIndex?: number;
    onClose: () => void;
}

export default function ImageLightbox({ isOpen, imageUrls = [], initialIndex = 0, onClose }: ImageLightboxProps) {
    const [mounted, setMounted] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [scale, setScale] = useState(1);
    const [prevDist, setPrevDist] = useState(0);
    const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
    const [viewport, setViewport] = useState({ width: 0, height: 0 });

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const imgRef = useRef<HTMLImageElement>(null);

    // Sync index if initial changes (optional, mostly for single open)
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
        }
    }, [isOpen, initialIndex]);

    useEffect(() => {
        setMounted(true);
        if (typeof window !== "undefined") {
            setViewport({ width: window.innerWidth, height: window.innerHeight });
        }
        if (isOpen) {
            document.body.style.overflow = "hidden";
            setScale(1);
            x.set(0);
            y.set(0);
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen, x, y]);

    // Handle constraints and auto-clamping
    const constraints = {
        left: -Math.max(0, (imgSize.width * scale - viewport.width) / 2),
        right: Math.max(0, (imgSize.width * scale - viewport.width) / 2),
        top: -Math.max(0, (imgSize.height * scale - viewport.height) / 2),
        bottom: Math.max(0, (imgSize.height * scale - viewport.height) / 2),
    };

    useEffect(() => {
        if (!isOpen) return;

        const currentX = x.get();
        const currentY = y.get();

        const clampedX = Math.max(constraints.left, Math.min(constraints.right, currentX));
        const clampedY = Math.max(constraints.top, Math.min(constraints.bottom, currentY));

        if (clampedX !== currentX) animate(x, clampedX, { duration: 0.1 });
        if (clampedY !== currentY) animate(y, clampedY, { duration: 0.1 });
    }, [scale, constraints.left, constraints.right, constraints.top, constraints.bottom, isOpen, x, y]);

    const handleWheel = (e: React.WheelEvent) => {
        const delta = e.deltaY;
        const zoomStep = 0.2;
        setScale((prev) => {
            const newScale = prev - (delta > 0 ? zoomStep : -zoomStep);
            return Math.max(1, Math.min(newScale, 5));
        });
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const dist = Math.hypot(touch1.pageX - touch2.pageX, touch1.pageY - touch2.pageY);

            if (prevDist > 0) {
                const diff = dist - prevDist;
                setScale((prev) => {
                    const newScale = prev + diff * 0.01;
                    return Math.max(1, Math.min(newScale, 5));
                });
            }
            setPrevDist(dist);
        }
    };

    const handleTouchEnd = () => {
        setPrevDist(0);
    };

    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { naturalWidth, naturalHeight } = e.currentTarget;
        const dw = window.innerWidth;
        const dh = (naturalHeight / naturalWidth) * dw; // Keep aspect ratio, fit width
        setImgSize({ width: dw, height: dh });
        setScale(1);
        x.set(0);
        y.set(0);
    };

    const nextImage = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (currentIndex < imageUrls.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setScale(1);
        }
    }, [currentIndex, imageUrls.length]);

    const prevImage = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setScale(1);
        }
    }, [currentIndex]);

    // Keyboard Nav
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") nextImage();
            if (e.key === "ArrowLeft") prevImage();
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, nextImage, prevImage, onClose]);

    if (!mounted) return null;

    // Safety check
    const currentSrc = imageUrls[currentIndex] || "";

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={styles.overlay}
                    onClick={onClose}
                    onWheel={handleWheel}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={28} />
                    </button>

                    {/* Navigation Buttons */}
                    {currentIndex > 0 && (
                        <button className={`${styles.navBtn} ${styles.prevBtn}`} onClick={prevImage}>
                            <ChevronLeft size={32} />
                        </button>
                    )}
                    {currentIndex < imageUrls.length - 1 && (
                        <button className={`${styles.navBtn} ${styles.nextBtn}`} onClick={nextImage}>
                            <ChevronRight size={32} />
                        </button>
                    )}

                    {/* Counter Badge */}
                    {imageUrls.length > 1 && (
                        <div className={styles.counterBadge}>
                            {currentIndex + 1} / {imageUrls.length}
                        </div>
                    )}

                    <div className={styles.container} onClick={(e) => e.stopPropagation()}>
                        <motion.img
                            key={currentSrc} // Key change forces re-render for clean transition
                            ref={imgRef}
                            src={currentSrc}
                            alt={`Image ${currentIndex + 1}`}
                            className={styles.image}
                            onLoad={handleImageLoad}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: scale, x: x.get(), y: y.get() }} // Bind motion values? No, bind via style prop for drag
                            style={{ x, y, scale }} // Scale here to separate from drag
                            drag
                            dragConstraints={constraints}
                            dragElastic={0}
                            dragMomentum={false}
                            whileTap={{ cursor: "grabbing" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
