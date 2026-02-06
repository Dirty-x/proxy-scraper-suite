import type { Proxy } from './proxy.js';

/**
 * Result of a single validation test
 */
export interface TestResult {
    passed: boolean;
    latencyMs?: number;
    error?: string;
    details?: Record<string, any>;
}

/**
 * Complete validation result for a proxy
 */
export interface ValidationResult {
    proxy: Proxy;
    passed: boolean;
    tests: {
        connectivity: TestResult;
        anonymity: TestResult;
        speed: TestResult;
        geolocation: TestResult;
    };
    timestamp: Date;
    validatedBy: string;
    retryCount: number;
}

/**
 * Validation statistics
 */
export interface ValidationStats {
    total: number;
    passed: number;
    failed: number;
    pending: number;
    averageLatencyMs: number;
    successRate: number;
}

/**
 * Validation task for worker queue
 */
export interface ValidationTask {
    id: string;
    proxy: Proxy;
    priority: number;
    retryCount: number;
    createdAt: Date;
}

/**
 * Validation configuration
 */
export interface ValidationConfig {
    concurrency: number;
    timeoutMs: number;
    retryAttempts: number;
    anonymityCheckUrl: string;
    speedTestUrl: string;
}
