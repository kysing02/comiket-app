export type LogLevel = 'INFO' | 'WARN' | 'ERROR';
export type LogCategory = 'DB' | 'API' | 'APP' | 'AUTH' | 'GENERAL';

export interface LogEntry {
    id: string;
    timestamp: Date;
    level: LogLevel;
    category: LogCategory;
    message: string;
    data?: any;
}

type LogListener = (logs: LogEntry[]) => void;

class Logger {
    private logs: LogEntry[] = [];
    private listeners: LogListener[] = [];
    private readonly MAX_LOGS = 1000;

    private addLog(level: LogLevel, category: LogCategory, message: string, data?: any) {
        const entry: LogEntry = {
            id: Math.random().toString(36).substring(2, 11),
            timestamp: new Date(),
            level,
            category,
            message,
            data,
        };

        this.logs = [entry, ...this.logs].slice(0, this.MAX_LOGS);

        // Console output with colors
        const timestampStr = entry.timestamp.toLocaleTimeString();
        const prefix = `[${timestampStr}] [${category}] [${level}]`;

        switch (level) {
            case 'ERROR':
                console.error(prefix, message, data || '');
                break;
            case 'WARN':
                console.warn(prefix, message, data || '');
                break;
            default:
                console.log(prefix, message, data || '');
                break;
        }

        this.notify();
    }

    private notify() {
        this.listeners.forEach(listener => listener(this.logs));
    }

    subscribe(listener: LogListener) {
        this.listeners.push(listener);
        listener(this.logs);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    info(category: LogCategory, message: string, data?: any) {
        this.addLog('INFO', category, message, data);
    }

    warn(category: LogCategory, message: string, data?: any) {
        this.addLog('WARN', category, message, data);
    }

    error(category: LogCategory, message: string, data?: any) {
        this.addLog('ERROR', category, message, data);
    }

    // Shorthands
    db(message: string, data?: any, level: LogLevel = 'INFO') {
        this.addLog(level, 'DB', message, data);
    }

    api(message: string, data?: any, level: LogLevel = 'INFO') {
        this.addLog(level, 'API', message, data);
    }

    app(message: string, data?: any, level: LogLevel = 'INFO') {
        this.addLog(level, 'APP', message, data);
    }

    getLogs() {
        return this.logs;
    }

    clear() {
        this.logs = [];
        this.notify();
    }
}

export const logger = new Logger();
