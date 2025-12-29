"use client";

import { motion, AnimatePresence, useMotionValue, animate, useTransform } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import styles from "./ImageLightbox.module.css";

interface ImageLightboxProps {
    isOpen: boolean;
    imageUrls: string[];
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
    const lastTap = useRef(0);

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            setScale(1);
            x.set(0);
            y.set(0);
        }
    }, [isOpen, initialIndex]);

    useEffect(() => {
        setMounted(true);
        if (typeof window !== "undefined") {
            setViewport({ width: window.innerWidth, height: window.innerHeight });
        }
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    const constraints = {
        left: -Math.max(0, (imgSize.width * scale - viewport.width) / 2),
        right: Math.max(0, (imgSize.width * scale - viewport.width) / 2),
        top: -Math.max(0, (imgSize.height * scale - viewport.height) / 2),
        bottom: Math.max(0, (imgSize.height * scale - viewport.height) / 2),
    };

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
        const ratio = naturalHeight / naturalWidth;
        const dh = dw * ratio;
        setImgSize({ width: dw, height: dh });
    };

    const nextImage = useCallback(() => {
        if (currentIndex < imageUrls.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setScale(1);
            x.set(0);
            y.set(0);
        }
    }, [currentIndex, imageUrls.length, x, y]);

    const prevImage = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setScale(1);
            x.set(0);
            y.set(0);
        }
    }, [currentIndex, x, y]);

    const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
        const now = Date.now();
        if (now - lastTap.current < 300) {
            if (scale > 1) {
                setScale(1);
                animate(x, 0);
                animate(y, 0);
            } else {
                setScale(3);
            }
        }
        lastTap.current = now;
    };

    const onDragEnd = (event: any, info: any) => {
        // Only swipe if not zoomed in
        if (scale === 1) {
            const threshold = 50;
            if (info.offset.x < -threshold) nextImage();
            else if (info.offset.x > threshold) prevImage();
        }
    };

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

                    {imageUrls.length > 1 && (
                        <div className={styles.counterBadge}>
                            {currentIndex + 1} / {imageUrls.length}
                        </div>
                    )}

                    <div className={styles.container} onClick={onClose}>
                        <motion.img
                            key={currentSrc}
                            ref={imgRef}
                            src={currentSrc}
                            alt="Lightbox"
                            className={styles.image}
                            onLoad={handleImageLoad}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDoubleTap(e);
                            }}
                            style={{ x, y, scale }}
                            drag={scale > 1 ? true : "x"} // Horizontal only if scale is 1 for swipe
                            dragConstraints={scale > 1 ? constraints : { left: 0, right: 0 }}
                            dragElastic={scale > 1 ? 0.1 : 0.5}
                            onDragEnd={onDragEnd}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: scale }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
