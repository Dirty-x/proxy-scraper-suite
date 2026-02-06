import { generateAgent } from '../base/generateAgent.js';

export const freeProxyWorld = generateAgent('https://www.freeproxy.world/?page=1', async ({ $, request: { label, userData }, crawler }: any) => {
    const { lastPage } = userData;

    if (!lastPage) {
        const last = +$('a.next').prev().text().trim();

        const requests = [...Array(last + 1).keys()].slice(2).map((page) => ({
            url: `https://www.freeproxy.world/?page=${page}`,
            label,
            userData: {
                lastPage: last,
            },
        }));

        await crawler.addRequests(requests);
    }

    return [...$('table.layui-table tr:not(:first-child)')].map((item) => {
        const elem = $(item);

        const host = elem.find('td:first-child').text().trim();
        const port = elem.find('td:nth-child(2)').text().trim();

        return {
            host,
            port,
            full: `${host}:${port}`,
            country: elem.find('td:nth-child(3)').text().trim().toLowerCase(),
            protocol: elem.find('td:nth-child(4)').text().toLowerCase().trim(),
            anonymity: elem.find('td:nth-child(5)').text().trim(),
        };
    });
});
