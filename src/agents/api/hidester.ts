import { generateAgent } from '../base/generateAgent.js';

type HidesterProxy = {
    IP: string;
    PORT: string;
    country: string;
    type: string;
    anonymity: string;
};

export const hidester = generateAgent(
    'https://hidester.com/proxydata/php/data.php?mykey=data&offset=0&limit=999999999&orderBy=latest_check&sortOrder=DESC',
    ({ body, response }: any) => {
        const bodyString = Buffer.from(body).toString('utf-8').trim();

        if (!bodyString.startsWith('[') && !bodyString.startsWith('{')) {
            return []; // Not JSON, likely an error page or block
        }

        const proxies = JSON.parse(bodyString) as HidesterProxy[];

        return proxies.map(({ IP, PORT, country, type, anonymity }) => ({
            host: IP,
            port: PORT,
            full: `${IP}:${PORT}`,
            country: country.toLowerCase(),
            protocol: type.toLowerCase(),
            anonymity: anonymity.toLowerCase(),
        }));
    },
    {
        headers: {
            referer: 'https://hidester.com/proxylist/',
        },
    }
);
