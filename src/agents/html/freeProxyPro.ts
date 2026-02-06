import { RequestOptions } from 'crawlee';
import { uuid } from '../../utils/crypto.js';
import { generateAgent } from '../base/generateAgent.js';
import { proxyDataFromTable } from '../base/proxyDataFromTable.js';

export const freeProxyPro = generateAgent('https://freeproxy.pro/', async ({ crawler, $, request: { userData, label } }: any) => {
    const { lastPage, currentPage } = userData as { lastPage: number; currentPage: number };

    if (!lastPage) {
        const max = +$('table + div + div.d-flex').text().split('of')![1].trim();
        const last = Math.ceil(max / 20);

        const requests: RequestOptions[] = [...Array(last + 1).keys()].slice(2).map((num) => {
            return {
                url: 'https://freeproxy.pro/',
                label,
                uniqueKey: uuid(),
                userData: {
                    lastPage: last,
                    currentPage: num,
                },
                method: 'POST',
                payload: new URLSearchParams({
                    update_sorting: 'desc',
                    page: num.toString(),
                }).toString(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            };
        });

        await crawler.addRequests(requests);
    }

    return proxyDataFromTable(
        { $, rows: 'tbody > tr' },
        {
            host: 1,
            port: 2,
            country: 3,
            protocol: 9,
        }
    );
});
