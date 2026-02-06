import { RequestOptions } from 'crawlee';
import { uuid } from '../../utils/crypto.js';

// Use native Node.js Buffer instead of deprecated atob package
const atob = (str: string) => Buffer.from(str, 'base64').toString('binary');

import { generateAgent } from '../base/generateAgent.js';

type UserData = {
    lastPage: number;
    currentPage: number;
};

export const advancedName = generateAgent('https://advanced.name/freeproxy', async ({ crawler, $, request: { label, userData } }: any) => {
    const { lastPage } = userData as UserData;

    if (!lastPage) {
        const last = +$('ul.pagination > li:nth-last-child(2) > a').text().trim();

        const requests: RequestOptions[] = [...Array(last + 1).keys()].slice(2).map((page) => ({
            url: `https://advanced.name/freeproxy?page=${page}`,
            uniqueKey: uuid(),
            label,
            userData: {
                lastPage: last,
                currentPage: page,
            },
        }));

        await crawler.addRequests(requests);
    }

    return [...$('tbody > tr')].map((item) => {
        const elem = $(item);

        const host = atob(elem.find('td[data-ip]').attr('data-ip')!);
        const port = atob(elem.find('td[data-port]').attr('data-port')!);

        return {
            host,
            port,
            full: `${host}:${port}`,
            country: elem.find('td:nth-child(5) > a').text().trim().toLowerCase(),
            protocol:
                [...elem.find('td:nth-child(4) > a:not(:last-child)')]
                    .map((a) => $(a).text().trim())
                    .join(',')
                    .toLowerCase() || null,
            anonymity:
                elem.find('td:nth-child(4) > a').length === 1
                    ? null
                    : elem.find('td:nth-child(4) > a:last-child').text().trim().toLowerCase(),
        };
    });
});
