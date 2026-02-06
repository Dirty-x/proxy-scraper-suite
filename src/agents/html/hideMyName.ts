import { generateAgent } from '../base/generateAgent.js';

export const hideMyName = generateAgent('https://hidemy.name/en/proxy-list/', async ({ crawler, $, request: { userData, label } }: any) => {
    const { lastPage } = userData;

    if (!lastPage) {
        const last = +$('div.proxy__pagination > ul > li:nth-last-child(2) > a').text().trim();

        const requests = [...Array(last + 1).keys()].slice(1).map((page) => ({
            url: `https://hidemy.name/en/proxy-list/?start=${page * 64}#list`,
            label,
            userData: {
                lastPage: last,
            },
        }));

        await crawler.addRequests(requests);
    }

    return [...$('div.table_block tbody > tr')].map((item) => {
        const elem = $(item);

        const host = elem.find('td:first-child').text().trim();
        const port = elem.find('td:nth-child(2)').text().trim();

        return {
            host,
            port,
            full: `${host}:${port}`,
            country: elem.find('td:nth-child(3)').text().split(/\s/)[0].trim().toLowerCase(),
            protocol: elem.find('td:nth-child(5)').text().toLowerCase().trim(),
            anonymity: elem.find('td:nth-child(6)').text().trim(),
        };
    });
});
