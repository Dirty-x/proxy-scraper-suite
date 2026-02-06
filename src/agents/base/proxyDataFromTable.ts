import type { Proxy } from '../../types/proxy.js';
import type { load } from 'cheerio';

type CheerioAPI = ReturnType<typeof load>;

type ProxyDataFromTableOptions = {
    /**
     * Cheerio object
     */
    $: CheerioAPI;
    /**
     * The selector for all the rows.
     */
    rows: string;
};

/**
 * Properties with either a number defining the position the data has in the row, or a selector to be used.
 */
type ProxyDataFromTableConfig = {
    [K in keyof Omit<Proxy, 'full' | 'anonymity' | 'country'>]: number | string | null;
} & {
    [K in keyof Omit<Proxy, 'full' | 'host' | 'port' | 'protocol'>]?: number | string | null;
};

const proxyFields: (keyof Proxy)[] = ['host', 'port', 'full', 'anonymity', 'country', 'protocol'];

export const proxyDataFromTable = ({ $, rows }: ProxyDataFromTableOptions, config: ProxyDataFromTableConfig): Proxy[] => {
    const items = $(rows).toArray();

    return items.map((item) => {
        const elem = $(item);

        return proxyFields.reduce((acc, key) => {
            const fieldKey = key as keyof Proxy;
            // populate full
            if (fieldKey === 'full') {
                return {
                    ...acc,
                    [fieldKey]: `${acc['host']}:${acc['port']}`,
                };
            }

            const configValue = (config as any)[fieldKey];
            if (!configValue) {
                return {
                    ...acc,
                    [fieldKey]: null,
                };
            }

            return {
                ...acc,
                [fieldKey]: $(elem)
                    .find(typeof configValue === 'string' ? configValue : `td:nth-child(${configValue})`)
                    .text()
                    .trim()
                    .toLowerCase(),
            };
        }, {} as Proxy);
    });
};
