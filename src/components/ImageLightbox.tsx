"use client";

import { motion, AnimatePresence, useMotionValue, animate, useTransform } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
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
    const carouselX = useMotionValue(0);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        setMounted(true);
        if (typeof window !== "undefined") {
            const handleResize = () => {
                setViewport({ width: window.innerWidth, height: window.innerHeight });
            };
            handleResize();
            window.addEventListener("resize", handleResize);
            return () => window.removeEventListener("resize", handleResize);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            setScale(1);
            x.set(0);
            y.set(0);
            carouselX.set(-initialIndex * viewport.width);
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen, initialIndex, viewport.width]);

    useEffect(() => {
        if (isOpen) {
            animate(carouselX, -currentIndex * viewport.width, {
                type: "spring",
                stiffness: 300,
                damping: 30,
            });
        }
    }, [currentIndex, viewport.width, isOpen]);

    const constraints = {
        left: -Math.max(0, (imgSize.width * scale - viewport.width) / 2),
        right: Math.max(0, (imgSize.width * scale - viewport.width) / 2),
        top: -Math.max(0, (imgSize.height * scale - viewport.height) / 2),
        bottom: Math.max(0, (imgSize.height * scale - viewport.height) / 2),
    };

    const zoomAt = useCallback((focalX: number, focalY: number, delta: number) => {
        setScale((s1) => {
            const s2 = Math.max(0.4, Math.min(s1 + delta, 5));
            if (s1 === s2) return s1;

            const xValue = x.get();
            const yValue = y.get();

            const cx = viewport.width / 2;
            const cy = viewport.height / 2;

            const relX = focalX - cx;
            const relY = focalY - cy;

            // Maintain the same relative point on the image under the focal point
            const x2 = relX - ((relX - xValue) * s2) / s1;
            const y2 = relY - ((relY - yValue) * s2) / s1;

            // Clamping boundaries to prevent black gaps
            const maxX = Math.max(0, (imgSize.width * s2 - viewport.width) / 2);
            const maxY = Math.max(0, (imgSize.height * s2 - viewport.height) / 2);

            x.set(Math.max(-maxX, Math.min(x2, maxX)));
            y.set(Math.max(-maxY, Math.min(y2, maxY)));

            return s2;
        });
    }, [viewport.width, viewport.height, x, y, imgSize]);

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        // Slower, multiplicative-style zoom
        const zoomStep = 0.15;
        const delta = e.deltaY > 0 ? -zoomStep * scale : zoomStep * scale;

        zoomAt(e.clientX, e.clientY, delta);

        // Immediate check for snap back if we are below 1
        if (scale < 1) {
            clearTimeout((window as any)._zoomTimeout);
            (window as any)._zoomTimeout = setTimeout(() => {
                setScale(s => {
                    if (s < 1) {
                        animate(x, 0, { type: "spring", stiffness: 400, damping: 35 });
                        animate(y, 0, { type: "spring", stiffness: 400, damping: 35 });
                        return 1;
                    }
                    return s;
                });
            }, 100);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            const midX = (t1.clientX + t2.clientX) / 2;
            const midY = (t1.clientY + t2.clientY) / 2;

            if (prevDist > 0) {
                // Multiplicative zoom for pinch is much more accurate
                const ratio = dist / prevDist;
                const delta = scale * (ratio - 1);
                zoomAt(midX, midY, delta);
            }
            setPrevDist(dist);
        }
    };

    const handleTouchEnd = () => {
        setPrevDist(0);
        if (scale < 1) {
            setScale(1);
            animate(x, 0, { type: "spring", stiffness: 400, damping: 35 });
            animate(y, 0, { type: "spring", stiffness: 400, damping: 35 });
        }
    };

    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { naturalWidth, naturalHeight } = e.currentTarget;
        if (naturalWidth > 0 && naturalHeight > 0 && viewport.width > 0) {
            const ratio = Math.min(viewport.width / naturalWidth, viewport.height / naturalHeight);
            setImgSize({
                width: naturalWidth * ratio,
                height: naturalHeight * ratio
            });
        }
    };

    useEffect(() => {
        if (imgRef.current && scale === 1 && viewport.width > 0) {
            const { naturalWidth, naturalHeight } = imgRef.current;
            if (naturalWidth > 0 && naturalHeight > 0) {
                const ratio = Math.min(viewport.width / naturalWidth, viewport.height / naturalHeight);
                setImgSize({
                    width: naturalWidth * ratio,
                    height: naturalHeight * ratio
                });
            }
        }
    }, [currentIndex, viewport, scale]);

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
                const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
                const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY;
                zoomAt(clientX, clientY, 2);
            }
        }
        lastTap.current = now;
    };

    const onCarouselDragEnd = (event: any, info: any) => {
        const threshold = 50;
        const velocity = info.velocity.x;
        if (info.offset.x < -threshold || velocity < -500) nextImage();
        else if (info.offset.x > threshold || velocity > 500) prevImage();
        else {
            animate(carouselX, -currentIndex * viewport.width, {
                type: "spring",
                stiffness: 300,
                damping: 30,
            });
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
                    <button className={styles.closeBtn} onClick={(e) => { e.stopPropagation(); onClose(); }}>
                        <X size={28} />
                    </button>

                    {imageUrls.length > 1 && (
                        <>
                            <div className={styles.counterBadge}>
                                {currentIndex + 1} / {imageUrls.length}
                            </div>
                            {currentIndex > 0 && (
                                <button className={`${styles.navBtn} ${styles.prevBtn}`} onClick={(e) => { e.stopPropagation(); prevImage(); }}>
                                    <ChevronLeft size={32} />
                                </button>
                            )}
                            {currentIndex < imageUrls.length - 1 && (
                                <button className={`${styles.navBtn} ${styles.nextBtn}`} onClick={(e) => { e.stopPropagation(); nextImage(); }}>
                                    <ChevronRight size={32} />
                                </button>
                            )}
                        </>
                    )}

                    <div className={styles.container} onClick={onClose}>
                        <motion.div
                            className={styles.carousel}
                            style={{ x: carouselX }}
                            drag={scale === 1 ? "x" : false}
                            dragConstraints={{ left: -((imageUrls.length - 1) * viewport.width), right: 0 }}
                            dragElastic={0.2}
                            onDragEnd={onCarouselDragEnd}
                        >
                            {imageUrls.map((url, index) => (
                                <div key={url} className={styles.slide} onClick={onClose}>
                                    <motion.img
                                        ref={index === currentIndex ? imgRef : null}
                                        src={url}
                                        alt={`Slide ${index}`}
                                        className={styles.image}
                                        onLoad={index === currentIndex ? handleImageLoad : undefined}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDoubleTap(e);
                                        }}
                                        style={index === currentIndex ? { x, y, scale } : { scale: 1 }}
                                        drag={index === currentIndex && scale > 1 ? true : false}
                                        dragConstraints={index === currentIndex ? constraints : undefined}
                                        dragElastic={0.1}
                                        initial={false}
                                        animate={index === currentIndex ? { scale } : { scale: 1 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
