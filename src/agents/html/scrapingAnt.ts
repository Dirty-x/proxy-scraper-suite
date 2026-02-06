import { generateAgent } from '../base/generateAgent.js';
import { proxyDataFromTable } from '../base/proxyDataFromTable.js';

export const scrapingAnt = generateAgent('https://scrapingant.com/proxies', ({ $ }: any) => {
    return proxyDataFromTable(
        { $, rows: 'tr:not(:first-child)' },
        {
            host: 1,
            port: 2,
            protocol: 3,
            country: 4,
        }
    );
});
