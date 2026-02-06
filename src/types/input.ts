export type InputSchema = {
    proxy: {
        useCloudProxy?: boolean;
        cloudProxyGroups?: string[];
        proxyUrls?: string[];
    };
    runTests: boolean;
    testWorkers?: number;
    concurrency?: number;
    debug: boolean;
    kvStoreName: string;
};
