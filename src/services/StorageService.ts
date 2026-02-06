import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

/**
 * Enterprise Storage Service
 * Handles persistence of scraped data and cache to the local file system.
 */
export class StorageService {
    private static baseDir = path.join(process.cwd(), 'storage');
    private static resultsDir = path.join(process.cwd(), 'storage', 'proxy-results');
    private static currentSessionDir: string | null = null;

    /**
     * Set the current session ID and prepare directories
     */
    static async setSession(id: string): Promise<string> {
        this.currentSessionDir = path.join(this.resultsDir, id);
        await fs.mkdir(this.currentSessionDir, { recursive: true });
        return this.currentSessionDir;
    }

    private static get currentResultsDir(): string {
        return this.currentSessionDir || this.resultsDir;
    }

    /**
     * Initialize storage directories
     */
    static async ensureStorage(): Promise<void> {
        await fs.mkdir(this.baseDir, { recursive: true });
        await fs.mkdir(this.resultsDir, { recursive: true });
        await fs.mkdir(path.join(this.baseDir, 'cache'), { recursive: true });
    }

    /**
     * Save objects to the local dataset
     * @param data Data to save
     * @param name Dataset name (default: 'default')
     */
    static async saveToDataset(data: any | any[], name = 'results'): Promise<void> {
        await this.ensureStorage();
        const filePath = path.join(this.currentResultsDir, `${name}.json`);

        let existing: any[] = [];
        try {
            const content = await fs.readFile(filePath, 'utf8');
            existing = JSON.parse(content);
        } catch (e) {
            // New dataset
        }

        const items = Array.isArray(data) ? data : [data];
        await fs.writeFile(filePath, JSON.stringify([...existing, ...items], null, 2));
    }

    /**
     * Save a value to the local cache
     */
    static async setCache(key: string, value: any): Promise<void> {
        await this.ensureStorage();
        const filePath = path.join(this.baseDir, 'cache', `${key}.json`);
        await fs.writeFile(filePath, JSON.stringify(value, null, 2));
    }

    /**
     * Get a value from the local cache
     */
    static async getCache<T>(key: string): Promise<T | null> {
        await this.ensureStorage();
        const filePath = path.join(this.baseDir, 'cache', `${key}.json`);
        try {
            const content = await fs.readFile(filePath, 'utf8');
            return JSON.parse(content) as T;
        } catch (e) {
            return null;
        }
    }

    /**
     * Save a file (e.g., .txt) to the storage
     */
    static async saveFile(name: string, content: string, extension = 'txt'): Promise<void> {
        await this.ensureStorage();
        const filePath = path.join(this.currentResultsDir, `${name}.${extension}`);
        await fs.writeFile(filePath, content);
    }

    /**
     * Append to a file (e.g., .txt) in the storage
     */
    static async appendFile(name: string, content: string, extension = 'txt'): Promise<void> {
        await this.ensureStorage();
        const filePath = path.join(this.currentResultsDir, `${name}.${extension}`);
        await fs.appendFile(filePath, content);
    }

    /**
     * Get all items from a dataset
     */
    static async getDataset(name = 'results'): Promise<any[]> {
        await this.ensureStorage();
        const filePath = path.join(this.currentResultsDir, `${name}.json`);
        try {
            const content = await fs.readFile(filePath, 'utf8');
            return JSON.parse(content);
        } catch (e) {
            return [];
        }
    }
    /**
     * List all past sessions
     */
    static async listSessions(): Promise<{ id: string; date: Date }[]> {
        await this.ensureStorage();
        try {
            const entries = await fs.readdir(this.resultsDir, { withFileTypes: true });

            return entries
                .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('session-'))
                .map(dirent => {
                    const id = dirent.name;
                    // Format: session-YYYY-MM-DDTHH-mm-ss-sssZ
                    // Extract date part: YYYY-MM-DDTHH-mm-ss-sssZ
                    const dateStr = id.replace('session-', '').replace(/-/g, (match, offset) => {
                        // Replace dashes with colons/dots to restore ISO format?
                        // Actually, simpler to just rely on fs stats for sorting if needed, 
                        // but let's try to parse the ID or just return the ID.
                        return match;
                    });

                    // Simple parsing attempt, or just use fs stats
                    return { id, date: new Date() }; // Placeholder, precise date parsing might vary
                })
                .sort((a, b) => b.id.localeCompare(a.id)); // Newest first
        } catch (error) {
            return [];
        }
    }

    /**
     * Get results from a specific past session
     */
    static async getSessionResults(sessionId: string): Promise<any[]> {
        // Prevent directory traversal
        const safeId = path.basename(sessionId);
        const sessionDir = path.join(this.resultsDir, safeId);
        const filePath = path.join(sessionDir, 'results.json');

        try {
            const content = await fs.readFile(filePath, 'utf8');
            return JSON.parse(content);
        } catch (e) {
            return [];
        }
    }
}
