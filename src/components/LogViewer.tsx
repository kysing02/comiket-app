"use client";

import React, { useState, useEffect, useRef } from 'react';
import { logger, LogEntry, LogLevel, LogCategory } from '@/lib/logger';
import styles from './LogViewer.module.css';

export const LogViewer: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [filter, setFilter] = useState<LogCategory | 'ALL'>('ALL');
    const [levelFilter, setLevelFilter] = useState<LogLevel | 'ALL'>('ALL');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsubscribe = logger.subscribe((newLogs) => {
            setLogs([...newLogs]);
        });
        return unsubscribe;
    }, []);

    const filteredLogs = logs.filter(log => {
        const categoryMatch = filter === 'ALL' || log.category === filter;
        const levelMatch = levelFilter === 'ALL' || log.level === levelFilter;
        return categoryMatch && levelMatch;
    });

    const clearLogs = () => {
        logger.clear();
    };

    if (!isOpen) {
        return (
            <button
                className={styles.toggleButton}
                onClick={() => setIsOpen(true)}
                title="View Logs"
            >
                📋
            </button>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>Logs</h3>
                <div className={styles.controls}>
                    <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
                        <option value="ALL">All Categories</option>
                        <option value="DB">Database</option>
                        <option value="API">API</option>
                        <option value="APP">App</option>
                    </select>
                    <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value as any)}>
                        <option value="ALL">All Levels</option>
                        <option value="INFO">Info</option>
                        <option value="WARN">Warn</option>
                        <option value="ERROR">Error</option>
                    </select>
                    <button onClick={clearLogs} className={styles.clearBtn}>Clear</button>
                    <button onClick={() => setIsOpen(false)} className={styles.closeBtn}>×</button>
                </div>
            </div>
            <div className={styles.logList} ref={scrollRef}>
                {filteredLogs.length === 0 ? (
                    <div className={styles.empty}>No logs found</div>
                ) : (
                    filteredLogs.map(log => (
                        <div key={log.id} className={`${styles.logItem} ${styles[log.level.toLowerCase()]}`}>
                            <span className={styles.timestamp}>{log.timestamp.toLocaleTimeString()}</span>
                            <span className={styles.category}>[{log.category}]</span>
                            <span className={styles.level}>[{log.level}]</span>
                            <span className={styles.message}>{log.message}</span>
                            {log.data && (
                                <details className={styles.details}>
                                    <summary>Data</summary>
                                    <pre>{JSON.stringify(log.data, null, 2)}</pre>
                                </details>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
