/**
 * Application Configuration
 * Centralized configuration management with environment variable validation
 */

export const config = {
    /**
     * Scraper configuration
     */
    scraper: {
        concurrency: parseInt(process.env.CONCURRENCY || '8', 10),
        timeout: parseInt(process.env.TIMEOUT || '120', 10),
        retries: parseInt(process.env.RETRIES || '2', 10),
        maxRequestsPerCrawl: process.env.MAX_REQUESTS
            ? parseInt(process.env.MAX_REQUESTS, 10)
            : undefined,
    },

    /**
     * Testing configuration
     */
    testing: {
        enabled: process.env.RUN_TESTS !== 'false', // Default to true
        workers: parseInt(process.env.TEST_WORKERS || '5', 10),
        timeout: parseInt(process.env.TEST_TIMEOUT || '20', 10),
    },

    /**
     * Storage configuration
     */
    storage: {
        kvStoreName: process.env.KV_STORE_NAME || 'default',
        datasetName: process.env.DATASET_NAME || 'default',
        cacheEnabled: process.env.CACHE_ENABLED === 'true',
        cacheTTL: parseInt(process.env.CACHE_TTL || '3600', 10),
    },

    /**
     * Logging configuration
     */
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        debug: process.env.DEBUG === 'true',
    },

    /**
     * Proxy configuration
     */
    proxy: {
        useCloudProxy: process.env.USE_CLOUD_PROXY === 'true',
        cloudProxyGroups: process.env.CLOUD_PROXY_GROUPS?.split(',') || [],
        proxyUrls: process.env.PROXY_URLS?.split(',') || [],
    },
} as const;

/**
 * Validate configuration on startup
 * Throws an error if required configuration is missing or invalid
 */
export function validateConfig(): void {
    const errors: string[] = [];

    // Validate numeric ranges
    if (config.scraper.concurrency < 1 || config.scraper.concurrency > 100) {
        errors.push('CONCURRENCY must be between 1 and 100');
    }

    if (config.scraper.timeout < 1 || config.scraper.timeout > 300) {
        errors.push('TIMEOUT must be between 1 and 300 seconds');
    }

    if (config.testing.workers < 1 || config.testing.workers > 50) {
        errors.push('TEST_WORKERS must be between 1 and 50');
    }

    // Validate storage names
    if (!/^[a-zA-Z0-9-_]+$/.test(config.storage.kvStoreName)) {
        errors.push('KV_STORE_NAME must contain only alphanumeric characters, hyphens, and underscores');
    }

    if (errors.length > 0) {
        throw new Error(`Configuration validation failed:\\n${errors.join('\\n')}`);
    }
}

/**
 * Get configuration value by path
 * @example getConfig('scraper.concurrency') // returns 8
 */
export function getConfig(path: string): any {
    return path.split('.').reduce((obj: any, key) => obj?.[key], config);
}
