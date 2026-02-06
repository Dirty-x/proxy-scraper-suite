import { ConfigService } from './services/ConfigService.js';
import { CrawlerEngine } from './core/Crawler.js';
import { router } from './core/Router.js';
import { proxyService } from './services/ProxyService.js';
import { StorageService } from './services/StorageService.js';
import { LocationService } from './services/LocationService.js';
import { HealthService } from './services/HealthService.js';
import type { InputSchema } from './types/input.js';
import { LoggerService } from './services/LoggerService.js';
import { DashboardService } from './services/DashboardService.js';
import { parseArgs } from 'node:util';

/**
 * Main application entry point
 * Orchestrates the initialization of services and the execution of the crawler.
 */
async function bootstrap() {
    // Set up global error handlers to prevent crashes
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
        LoggerService.warn('Unhandled Promise Rejection:', {
            reason: reason?.message || reason,
            stack: reason?.stack,
        });
    });

    process.on('uncaughtException', (error: Error) => {
        // Log the error but don't crash for network-related errors
        if (error.message?.includes('TLS') ||
            error.message?.includes('ECONNRESET') ||
            error.message?.includes('socket disconnected')) {
            LoggerService.warn('Network error caught:', { error: error.message });
        } else {
            LoggerService.error('Uncaught Exception:', { error: error.message, stack: error.stack });
            // Only exit for non-network errors
            process.exit(1);
        }
    });

    try {
        // 1. Parse CLI Arguments
        const { values } = parseArgs({
            options: {
                testWorkers: { type: 'string', short: 'w' },
                concurrency: { type: 'string', short: 'c' },
                debug: { type: 'boolean', short: 'd' },
                runTests: { type: 'boolean', short: 't' },
            },
            strict: false,
        });

        // 2. Initialize Core Services
        LoggerService.info('Bootstrapping Proxy Scraper...');
        DashboardService.initialize();
        const input = (await ConfigService.getInput<InputSchema>()) ?? ({} as InputSchema);

        // Merge CLI overrides
        const debug = (values.debug as boolean) ?? input.debug ?? false;
        const runTests = (values.runTests as boolean) ?? input.runTests ?? true;
        const testWorkers = values.testWorkers ? parseInt(values.testWorkers as string) : input.testWorkers;
        const concurrency = values.concurrency ? parseInt(values.concurrency as string) : input.concurrency;

        await StorageService.ensureStorage();
        await proxyService.initialize({ runTests });

        // 3. Initialize and Run Crawler Engine
        const engine = new CrawlerEngine({
            debug,
            proxy: input.proxy,
            concurrency: concurrency || 10,
        });

        // Update input with CLI overrides for downstream services
        input.debug = debug;
        input.runTests = runTests;
        input.testWorkers = testWorkers;
        input.concurrency = concurrency;

        // Re-inject merged input into ConfigService if necessary (or just pass down)
        // configService handles the .json file, but services read from it.
        // For this run, we've already initialized services with the correct values.

        await engine.run();

        // 4. Cleanup
        HealthService.logHealth();
        await proxyService.shutdown();
        LoggerService.info('All tasks completed successfully.');
        process.exit(0);
    } catch (error: any) {
        LoggerService.error('Fatal error during execution:', { error: error.message });
        process.exit(1);
    }
}

// Start the application
bootstrap();
