import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { config as envConfig } from '../config/app.config.js';

/**
 * Enterprise Config Service
 * Handles loading of application configuration from local files and environment.
 */
export class ConfigService {
    static readonly DEFAULTS = {
        NAV_TIMEOUT: 120, // seconds
        MAX_RETRIES: 2,
        MAX_TRACKED_PROXIES: 100000,
        MIN_CONCURRENCY: 5,
        SESSION_MAX_USAGE: 50,
        VALIDATOR_CONCURRENCY: 10,
        VALIDATOR_TIMEOUT_MS: 10000,
        VALIDATOR_RETRY_ATTEMPTS: 2,
        ANONYMITY_CHECK_URL: 'https://api.ipify.org?format=json',
        SPEED_TEST_URL: 'https://www.google.com',
    };

    /**
     * Load combined configuration
     * input.json takes precedence over environment variables
     */
    static async getInput<T>(): Promise<T> {
        const inputPath = path.join(process.cwd(), 'input.json');
        let fileInput: any = {};

        try {
            const content = await fs.readFile(inputPath, 'utf8');
            fileInput = JSON.parse(content);
        } catch (e) {
            // fileInput remains empty
        }

        // Merge file input with environment-based defaults
        return {
            proxy: fileInput.proxy || {
                useCloudProxy: envConfig.proxy.useCloudProxy,
                proxyUrls: envConfig.proxy.proxyUrls
            },
            runTests: fileInput.runTests ?? envConfig.testing.enabled,
            debug: fileInput.debug ?? envConfig.logging.debug,
            kvStoreName: fileInput.kvStoreName || envConfig.storage.kvStoreName,
        } as unknown as T;
    }
}
