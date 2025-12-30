import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import styles from "./ConfirmModal.module.css";

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDanger = false
}) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className={`${styles.modal} glass`}
                >
                    <div className={styles.header}>
                        <div className={styles.titleRow}>
                            {isDanger && <AlertTriangle size={20} className={styles.dangerIcon} />}
                            <h3>{title}</h3>
                        </div>
                        <button className={styles.closeBtn} onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className={styles.content}>
                        <p>{message}</p>
                    </div>

                    <div className={styles.footer}>
                        <button className={styles.cancelBtn} onClick={onClose}>
                            {cancelText}
                        </button>
                        <button
                            className={`${styles.confirmBtn} ${isDanger ? styles.dangerBtn : ""}`}
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                        >
                            {confirmText}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
