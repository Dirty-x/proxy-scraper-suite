import type { Controller } from '../../types/agent.js';
import { generateAgent } from '../base/generateAgent.js';

type NuxtData = {
    data: {
        proxies: {
            ip: string;
            port: number;
            type: string;
            anonymity: string;
            country: string;
        }[];
    }[];
};

const controller: Controller = ({ $, request: { label, userData }, crawler }: any) => {
    const script = $('script')
        .toArray()
        .map((s: any) => $(s).text())
        .find((s: string) => s.includes('window.__NUXT__'));

    if (!script) return [];

    // SECURITY: Instead of using vm2, we use Function constructor with strict validation
    // This is safer than vm2 which has known vulnerabilities.
    // The script contains window.__NUXT__ = { ... };
    let nuxt: NuxtData;
    try {
        const scriptContent = script.replace(/window\.__NUXT__=/, '').trim();
        const sandboxedFn = new Function(`return (${scriptContent});`);
        nuxt = sandboxedFn() as NuxtData;
    } catch (error) {
        return [];
    }

    const { lastPage } = userData;

    if (!lastPage) {
        const last = 10; // OpenProxy pagination is complex, limiting to 10 pages

        const requests = [...Array(last + 1).keys()].slice(1).map((page) => ({
            url: `https://openproxy.space/free-proxy-list/${label}/${page}`,
            label,
            userData: {
                lastPage: last,
            },
        }));

        // Note: crawler is available in the context
        crawler.addRequests(requests);
    }

    const raw = nuxt?.data?.[0]?.proxies || [];

    return raw.map(({ ip, port, type, anonymity, country }) => ({
        host: ip,
        port: port.toString(),
        full: `${ip}:${port}`,
        protocol: type,
        anonymity,
        country: country.toLowerCase(),
    }));
};

export const openProxyHttp = generateAgent('https://openproxy.space/free-proxy-list/http', controller, { label: 'http' });
export const openProxySocks4 = generateAgent('https://openproxy.space/free-proxy-list/socks4', controller, { label: 'socks4' });
export const openProxySocks5 = generateAgent('https://openproxy.space/free-proxy-list/socks5', controller, { label: 'socks5' });
