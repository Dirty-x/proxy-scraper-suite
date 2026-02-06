import { CheerioCrawler, log, LogLevel, ProxyConfiguration } from '@crawlee/cheerio';
import { uuid } from '../utils/crypto.js';
import { router } from './Router.js';
import { agents } from '../agents/index.js';
import { proxyService } from '../services/ProxyService.js';
import { ConfigService } from '../services/ConfigService.js';

export interface CrawlerOptions {
    debug?: boolean;
    proxy?: any;
    maxRequests?: number;
    concurrency?: number;
}

/**
 * Enterprise Crawler Engine
 * Configures and runs the Crawlee engine with the registered agents.
 */
export class CrawlerEngine {
    private crawler: CheerioCrawler;

    constructor(options: CrawlerOptions = {}) {
        if (options.debug) log.setLevel(LogLevel.DEBUG);

        const proxyConfiguration = options.proxy?.useCloudProxy || options.proxy?.proxyUrls?.length
            ? new ProxyConfiguration(options.proxy as any)
            : undefined;

        this.crawler = new CheerioCrawler({
            proxyConfiguration,
            requestHandler: router,
            maxRequestsPerCrawl: options.maxRequests,
            autoscaledPoolOptions: {
                minConcurrency: ConfigService.DEFAULTS.MIN_CONCURRENCY,
                desiredConcurrency: options.concurrency || 15,
            },
            sessionPoolOptions: {
                sessionOptions: {
                    maxErrorScore: 1,
                    maxUsageCount: ConfigService.DEFAULTS.SESSION_MAX_USAGE,
                },
            },
            navigationTimeoutSecs: ConfigService.DEFAULTS.NAV_TIMEOUT,
            maxRequestRetries: ConfigService.DEFAULTS.MAX_RETRIES,
            additionalMimeTypes: ['text/plain'],
        });
    }

    /**
     * Run the scraping process for all registered agents
     */
    async run(): Promise<void> {
        log.info(`Starting crawler with ${agents.length} agents...`);

        const startRequests = agents.map(({ url, options }) => ({
            url,
            label: url,
            uniqueKey: uuid(),
            ...options,
        }));

        await this.crawler.run(startRequests);
        log.info('Crawl completed successfully.');
    }
}
