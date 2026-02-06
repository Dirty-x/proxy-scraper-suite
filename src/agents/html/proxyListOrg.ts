import { uuid } from '../../utils/crypto.js';

// Use native Node.js Buffer instead of deprecated atob package
const atob = (str: string) => Buffer.from(str, 'base64').toString('binary');

import { generateAgent } from '../base/generateAgent.js';

type UserData = {
    lastPage: number;
};

export const proxyListOrg = generateAgent(
    'https://proxy-list.org/english/index.php?p=1',
    async ({ $, request: { label, userData }, crawler }: any) => {
        const { lastPage } = userData as UserData;

        if (!lastPage) {
            const last = +$('div.table-menu > a:nth-last-child(2)').text().trim();

            const requests = [...Array(last + 1).keys()].slice(2).map((page) => ({
                url: `https://proxy-list.org/english/index.php?p=${page}`,
                label,
                uniqueKey: uuid(),
                userData: {
                    lastPage: last,
                },
            }));

            await crawler.addRequests(requests);
        }

        return [...$('div.table > ul')].map((item) => {
            const elem = $(item);

            const full = atob(
                elem
                    .find('li.proxy > script')
                    .text()
                    .match(/(?<=Proxy\(').+(?='\))/)![0]
            );

            const [host, port] = full.split(':');

            return {
                host,
                port,
                full,
                country: elem.find('li.country-city span.country').text().trim().split(/\s/)?.[0]?.toLowerCase(),
                protocol: elem.find('li.https').text().toLowerCase(),
                anonymity: elem.find('li.type').text().toLowerCase(),
            };
        });
    }
);
