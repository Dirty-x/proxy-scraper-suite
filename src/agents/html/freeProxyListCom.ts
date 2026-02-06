import { RequestOptions } from 'crawlee';
import { uuid } from '../../utils/crypto.js';

import { generateAgent } from '../base/generateAgent.js';

type UserData = {
    lastPage: number;
};

export const freeProxyListCom = generateAgent(
    'https://free-proxy-list.com/?page=&port=&search=Search&up_time=50',
    async ({ $, request: { label, userData }, crawler }: any) => {
        const { lastPage } = userData as UserData;

        if (!lastPage) {
            const lastAttr = $('ul.pagination li:last-child > a[data]').attr('data');
            const last = lastAttr ? parseInt(lastAttr, 10) : 0;

            if (last > 1) {
                const requests: RequestOptions[] = [...Array(last + 1).keys()].slice(2).map((page) => ({
                    label,
                    url: `https://free-proxy-list.com/?page=${page}&port=&search=Search&up_time=50`,
                    uniqueKey: uuid(),
                    userData: {
                        lastPage: last,
                    },
                }));

                await crawler.addRequests(requests);
            }
        }

        return [...$('table.proxy-list tbody > tr')].map((item) => {
            const elem = $(item);
            const host = elem.find('td:first-child').text().trim();
            const port = elem.find('td:nth-child(3)').text().trim();

            return {
                host,
                port,
                full: `${host}:${port}`,
                country: elem.find('td:nth-child(4) > span[id]').attr('id')?.toLowerCase() || null,
                protocol: elem.find('td:nth-child(9)').text().trim(),
                anonymity: elem.find('td:nth-child(10)').text().trim().toLowerCase(),
            };
        });
    }
);
