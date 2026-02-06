import { generateAgent } from '../base/generateAgent.js';

export const ipRoyal = generateAgent('https://iproyal.com/free-proxy-list/', ({ $ }: any) => {
    return [...$('div.free-proxy-list__row:not(:first-child)')].map((item) => {
        const elem = $(item);

        const host = elem.find('div:first-child').text().trim();
        const port = elem.find('div:nth-child(2)').text().trim();

        return {
            host,
            port,
            full: `${host}:${port}`,
            country: elem.find('div:nth-child(3)').text().trim().toLowerCase(),
            protocol: elem.find('div:nth-child(4)').text().toLowerCase().trim(),
            anonymity: elem.find('div:nth-child(5)').text().trim(),
        };
    });
});
