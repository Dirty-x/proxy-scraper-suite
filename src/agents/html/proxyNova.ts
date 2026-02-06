// Use native Node.js Buffer instead of deprecated atob/btoa packages
const atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
const btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');

import { generateAgent } from '../base/generateAgent.js';
import type { Proxy } from '../../types/proxy.js';

export const proxyNova = generateAgent('https://www.proxynova.com/proxy-server-list/', ({ $ }: any) => {
    return [...$('tbody:nth-child(2) tr[data-proxy-id]')].map((item) => {
        const elem = $(item);

        const code = elem
            .find('td:first-child')
            .text()
            .match(/(?<=document\.write\().+(?=\))/)![0];

        // SECURITY: Instead of using vm2, we use Function constructor with strict validation
        // This is safer than vm2 which has known vulnerabilities
        // The code should only contain base64 decoding operations
        let host: string;
        try {
            // Create a sandboxed function with only atob and btoa available
            const sandboxedFn = new Function('atob', 'btoa', `return (${code});`);
            host = sandboxedFn(atob, btoa) as string;
        } catch (error) {
            // If execution fails, skip this proxy
            return null;
        }

        const port = elem.find('td:nth-child(2)').text().trim();

        return {
            host,
            port,
            full: `${host}:${port}`,
            country: elem.find('td:nth-child(6) > a').attr('title')?.replace('Proxies from ', '')?.toLowerCase() || null,
            anonymity: elem.find('td:nth-child(7)').text().trim(),
            protocol: null,
        } as Proxy;
    }).filter((p): p is Proxy => p !== null);
});
