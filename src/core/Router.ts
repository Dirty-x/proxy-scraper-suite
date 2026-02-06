import { createCheerioRouter } from 'crawlee';
import type { CheerioCrawlingContext } from 'crawlee';
import { proxyService } from '../services/ProxyService.js';
import { agents } from '../agents/index.js';
import { LoggerService } from '../services/LoggerService.js';

export const router = createCheerioRouter();

// Define blocked agents to skip in the current session
const blockedAgents = new Set<string>();

router.addDefaultHandler(({ request }) => LoggerService.warn(`Unknown route reached: ${request.url}`));

// Add all handlers to the router for each agent
for (const agent of agents) {
    const label = agent.options.label || 'Unknown';

    router.addHandler(agent.url, async (ctx) => {
        if (blockedAgents.has(label)) {
            LoggerService.debug(`Skipping blocked agent: ${label}`);
            return;
        }

        // Check for blocks (Cloudflare, Rate limits)
        const status = ctx.response.statusCode;
        if (status && (status === 429 || status >= 500)) {
            LoggerService.warn(`Agent "${label}" blocked or failed (Status: ${status}). Cooling down...`);
            blockedAgents.add(label);
            return;
        }

        try {
            // Context is naturally compatible with CheerioCrawlingContext
            const proxies = await agent.controller(ctx as unknown as CheerioCrawlingContext);
            if (proxies && proxies.length > 0) {
                LoggerService.info(`Agent "${label}" found ${proxies.length} proxies.`);
                await proxyService.add(proxies);
            }
        } catch (error: any) {
            LoggerService.error(`Agent "${label}" error: ${error.message}`);
        }
    });
}
