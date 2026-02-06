import { define } from 'nanolith';
import check from '@devhigley/test-proxy';
import { log } from 'crawlee';
import { threadId } from 'worker_threads';
import { ConfigService } from '../services/ConfigService.js';

import type { InputSchema } from '../types/input.js';
import type { Proxy } from '../types/proxy.js';

// ! the api behind this could be used in the future
// ! https://proxyscrape.com/online-proxy-checker
// Enhanced verification endpoints
const VERIFY_URLS = [
    'https://api.ipify.org?format=json',
    'https://ident.me/.json',
    'https://ifconfig.me/all.json'
];

const runTest = async ({ host, port }: { host: string; port: string }) => {
    const start = Date.now();
    try {
        const data = await check({
            host,
            port: +port,
        });

        const latency = Date.now() - start;

        // Detection for transparency can be added here if the check library returns the reflected IP
        // For now, we enhance the protocol metadata
        return { ...data, latency };
    } catch (error) {
        throw error;
    }
};

export const tester = await define({
    __initializeService: async () => {
        const { debug } = (await ConfigService.getInput<InputSchema>()) ?? {};
        if (debug) log.setLevel(log.LEVELS.DEBUG);
        log.debug(`Initialized testing service on thread: ${threadId}`);
    },
    test: async (proxies: Proxy[]) => {
        const id = Math.floor(Math.random() * 1e4);
        const promises = proxies.map((proxy) => {
            const { full, port, host, protocol, ...rest } = proxy;

            return (async function send(retries = 0): Promise<Proxy | null> {
                try {
                    const data = await runTest({ host, port });
                    log.debug(`${id}: Proxy ${full} passed test (${data.latency}ms).`);

                    return {
                        ...rest,
                        host,
                        port: port,
                        full,
                        protocol: protocol || data?.type,
                        latency: data.latency,
                        anonymity: (data as any).anonymity || 'unknown',
                    } as Proxy;
                } catch (error) {
                    // log.debug(`Proxy ${full} failed test: ${(error as { error: string }).error ?? (error as Error).message}`);
                    // ? This allows for retry functionality if needed in the future
                    if (retries >= 0) return null;
                    return send(retries + 1);
                }
            })();
        });

        const set = new Set(await Promise.all(promises));
        set.delete(null);

        // console.log(`${id}: Finished tests with ${set.size}`);
        log.debug(`${id}: Finished tests with ${set.size}`);
        return [...set] as Proxy[];
    },
});
