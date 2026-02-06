import { ServiceCluster } from 'nanolith';
import { LoggerService } from './LoggerService.js';
import { TypedEmitter } from 'tiny-typed-emitter';
import type { Proxy } from '../types/proxy.js';
import { batch } from '../utils/batcher.js';
import { tester as testWorker } from '../utils/test-worker.js';
import { StorageService } from './StorageService.js';
import { LocationService } from './LocationService.js';
import { DashboardService } from './DashboardService.js';

import os from 'os';
import { ConfigService } from './ConfigService.js';
import type { InputSchema } from '../types/input.js';

const CACHE_KEY = 'PROXY-STORE-STATE';

type StoreState = {
    queue: Proxy[];
    tracked: Record<string, number>;
};

/**
 * Enterprise Proxy Service
 * Orchestrates proxy collection, deduplication, testing, and persistence.
 */
class ProxyService extends TypedEmitter<{ update: (count: number) => void }> {
    private queue: Proxy[] = [];
    private tracked = new Set<string>();
    private cluster = new ServiceCluster(testWorker);
    private testEnabled = true;
    private sessionId = `session-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    private readonly MAX_TRACKED = ConfigService.DEFAULTS.MAX_TRACKED_PROXIES;

    /**
     * Initialize the service and start test workers
     */
    async initialize(options: { runTests: boolean }) {
        this.testEnabled = options.runTests;

        // Initialize session storage
        await StorageService.setSession(this.sessionId);
        LoggerService.info(`Started new session: ${this.sessionId}`);

        if (this.testEnabled) {
            const input = await ConfigService.getInput<InputSchema>();
            const workerCount = input?.testWorkers || Math.max(os.cpus().length - 1, 4);

            LoggerService.info(`Initializing proxy test cluster with ${workerCount} workers...`);
            await Promise.all(
                [...Array(workerCount).keys()].map(() => this.cluster.launchService({}))
            );
        }

        // Restore state from local cache
        const cached = await StorageService.getCache<StoreState>(CACHE_KEY);
        if (cached) {
            this.queue = cached.queue;
            // Convert Record to Set for deduplication
            this.tracked = new Set(Object.keys(cached.tracked));
            LoggerService.info(`Restored ${this.tracked.size} tracked proxies from cache.`);
        }
    }

    /**
     * Add new proxies to the store
     */
    async add(proxies: Proxy[]): Promise<void> {
        // Prevent memory leak by clearing cache if it gets too large
        if (this.tracked.size >= this.MAX_TRACKED) {
            LoggerService.debug('Tracked proxies limit reached. Clearing deduplication cache.');
            this.tracked.clear();
        }

        const unique = proxies.filter((p) => {
            const key = p.full.trim();
            if (this.tracked.has(key)) return false;
            this.tracked.add(key);
            return true;
        });

        if (unique.length === 0) return;

        await this.processBatch(unique);

        // Periodic autosave
        await this.sync();
    }

    /**
     * Process a batch of unique proxies: Test (optional) -> Enrich -> Store -> Broadcast
     */
    private async processBatch(proxies: Proxy[]): Promise<void> {
        if (this.testEnabled) {
            // Run tests in parallel batches
            const chunks = batch(proxies, 30);
            await Promise.all(chunks.map(async (chunk) => {
                const verified = await this.cluster.use().call({
                    name: 'test',
                    params: [chunk],
                }) as Proxy[];

                await this.enrichAndSave(verified);
            }));
        } else {
            await this.enrichAndSave(proxies);
        }
    }

    /**
     * Enrich proxies with location data, validate them, save them, and notify listeners
     */
    private async enrichAndSave(proxies: Proxy[]): Promise<void> {
        if (proxies.length === 0) return;

        const enriched = await Promise.all(proxies.map(async (proxy) => {
            const location = await LocationService.getProxyLocation(proxy.host);
            return { ...proxy, ...location };
        }));

        // Add proxies to validation queue (non-blocking)
        const { validationPool } = await import('./ValidationWorkerPool.js');
        validationPool.addToQueue(enriched).catch(err => {
            LoggerService.warn(`Validation queue error: ${err}`);
        });

        this.queue.push(...enriched);

        // Broadcast to Dashboard
        enriched.forEach(p => DashboardService.broadcastDiscovery(p));

        // Real-time export to TXT
        const textContent = enriched.map(p => p.full).join('\n') + '\n';
        await StorageService.appendFile('results', textContent);

        this.emit('update', this.queue.length);

        // Trigger immediate sync for Dataset consistency
        if (this.testEnabled) {
            await this.sync();
        }
    }

    /**
     * Persist current state to storage
     */
    async sync(): Promise<void> {
        if (this.queue.length > 0) {
            const batch = [...this.queue];
            this.queue = [];
            await StorageService.saveToDataset(batch);
            LoggerService.debug(`Saved batch of ${batch.length} proxies.`);
        }

        // Convert Set to Record for JSON serialization
        const trackedObj: Record<string, number> = {};
        for (const key of this.tracked) {
            trackedObj[key] = 1;
        }

        await StorageService.setCache(CACHE_KEY, {
            queue: this.queue,
            tracked: trackedObj,
        });
    }

    /**
     * Shutdown the service and cleanup workers
     */
    async shutdown(): Promise<void> {
        LoggerService.info('Shutting down ProxyService...');
        await this.sync();

        if (this.testEnabled) {
            await this.cluster.closeAll();
        }

        // Export final results to plain text
        const state = await StorageService.getCache<StoreState>(CACHE_KEY);
        if (state) {
            const items = await this.loadAll();
            const textContent = items.map(p => p.full).join('\n');
            await StorageService.saveFile('results', textContent);

            // Generate session summary
            const summary = this.generateSummary(items);
            await StorageService.saveFile('summary', summary, 'md');

            LoggerService.info(`Final export complete: ${items.length} proxies saved to ${this.sessionId}`);
        }
    }

    /**
     * Generate a professional session summary
     */
    private generateSummary(proxies: Proxy[]): string {
        const protocols = proxies.reduce((acc, p) => {
            const proto = p.protocol || 'unknown';
            acc[proto] = (acc[proto] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const countries = proxies.reduce((acc, p) => {
            const country = p.country || 'Unknown';
            acc[country] = (acc[country] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return `# Session Summary: ${this.sessionId}

## Overview
- **Total Verified Proxies**: ${proxies.length}
- **Timestamp**: ${new Date().toLocaleString()}

## Protocol Distribution
${Object.entries(protocols).map(([p, count]) => `- **${p.toUpperCase()}**: ${count}`).join('\n')}

## Top Countries
${Object.entries(countries)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([c, count]) => `- **${c}**: ${count}`)
                .join('\n')}
`;
    }

    /**
     * Load all saved proxies from dataset (mock for enterprise verification)
     */
    private async loadAll(): Promise<Proxy[]> {
        const dataset = await StorageService.getDataset();
        return dataset as unknown as Proxy[];
    }
}

export const proxyService = new ProxyService();
