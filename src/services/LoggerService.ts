import fs from 'node:fs/promises';
import path from 'node:path';

export class LoggerService {
    private static logDir = 'storage/logs';
    private static isInitialized = false;

    private static async ensureInitialized() {
        if (this.isInitialized) return;
        try {
            await fs.mkdir(this.logDir, { recursive: true });
            this.isInitialized = true;
        } catch (e) {
            // Silently fail if we can't create logs dir
        }
    }

    private static format(level: string, message: string, metadata?: any): string {
        const timestamp = new Date().toISOString();
        const metaStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}]: ${message}${metaStr}`;
    }

    private static async writeToFile(level: string, entry: string) {
        await this.ensureInitialized();
        try {
            const fileName = level === 'error' ? 'error.log' : 'combined.log';
            await fs.appendFile(path.join(this.logDir, fileName), entry + '\n');
        } catch (e) {
            // Log file write failed
        }
    }

    static info(message: string, metadata?: any) {
        const entry = this.format('info', message, metadata);
        console.log(`\x1b[32m${entry}\x1b[0m`); // Green
        this.writeToFile('info', entry);
    }

    static error(message: string, metadata?: any) {
        const entry = this.format('error', message, metadata);
        console.error(`\x1b[31m${entry}\x1b[0m`); // Red
        this.writeToFile('error', entry);
    }

    static warn(message: string, metadata?: any) {
        const entry = this.format('warn', message, metadata);
        console.warn(`\x1b[33m${entry}\x1b[0m`); // Yellow
        this.writeToFile('warn', entry);
    }

    static debug(message: string, metadata?: any) {
        if (process.env.LOG_LEVEL !== 'debug') return;
        const entry = this.format('debug', message, metadata);
        console.table(`\x1b[36m${entry}\x1b[0m`); // Cyan
        this.writeToFile('debug', entry);
    }
}
