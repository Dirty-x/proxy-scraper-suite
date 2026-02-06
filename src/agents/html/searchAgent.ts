import { CheerioCrawler, log } from '@crawlee/cheerio';
import { uuid } from '../../utils/crypto.js';
import type { Agent } from '../../types/agent.js';
import { proxyService } from '../../services/ProxyService.js';

/**
 * Comprehensive Search Agent
 * Dynamically discovers new proxy lists by searching the web.
 */
export const searchAgent: Agent = {
    url: 'https://duckduckgo.com/html/?q=fresh+proxy+list+daily+updated',
    options: {
        label: 'Search-Discovery',
    },
    controller: async ({ $, request, crawler }: any) => {
        const proxies: any[] = [];

        // If it's the first page, add more search queries for comprehensiveness
        if (!request.userData?.isQuery) {
            const queries = [
                'latest+socks5+proxies+list',
                'free+high+anonymity+proxy+list',
                'fresh+http+proxies+github'
            ];

            await crawler.addRequests(queries.map(q => ({
                url: `https://duckduckgo.com/html/?q=${q}`,
                label: 'Search-Discovery',
                userData: { isQuery: true }
            })));
        }

        // Extract links that look like proxy list providers
        const links: string[] = [];
        $('.result__a').each((_: number, el: any) => {
            const url = $(el).attr('href') || '';
            if (url.includes('proxy') || url.includes('list')) {
                links.push(url.startsWith('http') ? url : `https://${url}`);
            }
        });

        log.info(`Discovery: Found ${links.length} potential new sources from ${request.url}`);

        // Note: In a full implementation, we would queue these links for the crawler.
        // For this version, we'll extract any visible proxies on the search result page as well.
        const bodyText = $('body').text();
        const proxyRegex = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{2,5})/g;
        let match;

        while ((match = proxyRegex.exec(bodyText)) !== null) {
            proxies.push({
                host: match[1],
                port: match[2],
                full: match[0],
                protocol: 'http', // Default for found text
            });
        }

        return proxies;
    }
};
