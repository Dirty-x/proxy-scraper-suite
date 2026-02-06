import { LoggerService } from './LoggerService.js';
import { proxyValidator } from './ProxyValidator.js';
import type { Proxy } from '../types/proxy.js';
import type { ValidationResult, ValidationTask, ValidationStats } from '../types/validation.types.js';
import { EventEmitter } from 'events';

/**
 * ValidationWorkerPool
 * Manages concurrent validation of proxies using a worker pool
 */
export class ValidationWorkerPool extends EventEmitter {
    private queue: ValidationTask[] = [];
    private activeWorkers = 0;
    private maxWorkers: number;
    private results: Map<string, ValidationResult> = new Map();
    private stats: ValidationStats = {
        total: 0,
        passed: 0,
        failed: 0,
        pending: 0,
        averageLatencyMs: 0,
        successRate: 0,
    };

    constructor(maxWorkers = 10) {
        super();
        this.maxWorkers = maxWorkers;
    }

    /**
     * Add proxies to validation queue
     */
    async addToQueue(proxies: Proxy[]): Promise<void> {
        const tasks: ValidationTask[] = proxies.map((proxy, index) => ({
            id: `${proxy.full}-${Date.now()}-${index}`,
            proxy,
            priority: 0,
            retryCount: 0,
            createdAt: new Date(),
        }));

        this.queue.push(...tasks);
        this.stats.pending += tasks.length;
        this.stats.total += tasks.length;

        LoggerService.info(`Added ${tasks.length} proxies to validation queue. Queue size: ${this.queue.length}`);

        // Start processing
        this.processQueue();
    }

    /**
     * Process validation queue with worker pool
     */
    private async processQueue(): Promise<void> {
        while (this.queue.length > 0 && this.activeWorkers < this.maxWorkers) {
            const task = this.queue.shift();
            if (!task) break;

            this.activeWorkers++;
            this.stats.pending--;

            // Process task asynchronously
            this.processTask(task).finally(() => {
                this.activeWorkers--;
                // Continue processing if more tasks exist
                if (this.queue.length > 0) {
                    this.processQueue();
                }
            });
        }
    }

    /**
     * Process a single validation task
     */
    private async processTask(task: ValidationTask): Promise<void> {
        try {
            const result = await proxyValidator.validateProxy(task.proxy, task.retryCount);

            this.results.set(task.id, result);

            if (result.passed) {
                this.stats.passed++;
            } else {
                this.stats.failed++;

                // Retry logic
                if (task.retryCount < 2) {
                    LoggerService.debug(`Retrying validation for ${task.proxy.full} (attempt ${task.retryCount + 1})`);
                    task.retryCount++;
                    this.queue.push(task);
                    this.stats.pending++;
                    return;
                }
            }

            // Update average latency
            this.updateStats(result);

            // Emit validation event
            this.emit('validation_complete', result);

        } catch (error) {
            LoggerService.error(`Task processing error for ${task.proxy.full}: ${error}`);
            this.stats.failed++;
        }
    }

    /**
     * Update statistics
     */
    private updateStats(result: ValidationResult): void {
        const totalLatency = Array.from(this.results.values())
            .filter(r => r.tests.speed.latencyMs)
            .reduce((sum, r) => sum + (r.tests.speed.latencyMs || 0), 0);

        const validResults = Array.from(this.results.values()).filter(r => r.tests.speed.latencyMs);

        this.stats.averageLatencyMs = validResults.length > 0
            ? totalLatency / validResults.length
            : 0;

        this.stats.successRate = this.stats.total > 0
            ? (this.stats.passed / this.stats.total) * 100
            : 0;
    }

    /**
     * Get current validation statistics
     */
    getStats(): ValidationStats {
        return { ...this.stats };
    }

    /**
     * Get validation result for a specific proxy
     */
    getResult(proxyId: string): ValidationResult | undefined {
        return this.results.get(proxyId);
    }

    /**
     * Get all validation results
     */
    getAllResults(): ValidationResult[] {
        return Array.from(this.results.values());
    }

    /**
     * Clear all results and reset stats
     */
    clear(): void {
        this.queue = [];
        this.results.clear();
        this.stats = {
            total: 0,
            passed: 0,
            failed: 0,
            pending: 0,
            averageLatencyMs: 0,
            successRate: 0,
        };
    }

    /**
     * Wait for all pending validations to complete
     */
    async waitForCompletion(): Promise<void> {
        return new Promise((resolve) => {
            const checkCompletion = () => {
                if (this.queue.length === 0 && this.activeWorkers === 0) {
                    resolve();
                } else {
                    setTimeout(checkCompletion, 100);
                }
            };
            checkCompletion();
        });
    }
}

export const validationPool = new ValidationWorkerPool(10);
