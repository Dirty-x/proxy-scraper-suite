import { jest } from '@jest/globals';
import { proxyService } from './ProxyService.js';
import { StorageService } from './StorageService.js';

// Mock other dependencies
jest.mock('./LoggerService.js');
jest.mock('./DashboardService.js', () => ({
    DashboardService: {
        broadcastDiscovery: jest.fn()
    }
}));
jest.mock('./LocationService.js', () => ({
    LocationService: {
        getProxyLocation: jest.fn().mockResolvedValue({ country: 'US', city: 'Test City' } as never)
    }
}));
jest.mock('./ConfigService.js', () => ({
    ConfigService: {
        DEFAULTS: {
            MAX_TRACKED_PROXIES: 5,
            NAV_TIMEOUT: 120,
            MAX_RETRIES: 2,
            MIN_CONCURRENCY: 1,
            SESSION_MAX_USAGE: 10
        }
    }
}));

describe('ProxyService', () => {
    let saveToDatasetSpy: any;
    let setCacheSpy: any;

    beforeEach(() => {
        // Reset state
        (proxyService as any).queue = [];
        (proxyService as any).tracked = new Set();
        (proxyService as any).testEnabled = false;
        (proxyService as any).MAX_TRACKED = 5;

        // Spy on StorageService methods
        saveToDatasetSpy = jest.spyOn(StorageService, 'saveToDataset').mockImplementation(async () => { });
        setCacheSpy = jest.spyOn(StorageService, 'setCache').mockImplementation(async () => { });
        jest.spyOn(StorageService, 'appendFile').mockImplementation(async () => { });

        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should add unique proxies', async () => {
        const proxies = [
            { full: '1.1.1.1:80', host: '1.1.1.1', port: 80 },
            { full: '1.1.1.1:80', host: '1.1.1.1', port: 80 },
            { full: '2.2.2.2:80', host: '2.2.2.2', port: 80 }
        ];

        await proxyService.add(proxies as any);

        expect((proxyService as any).tracked.size).toBe(2);
        expect((proxyService as any).queue.length).toBe(0);
        expect(saveToDatasetSpy).toHaveBeenCalled();
    });

    it('should clear cache when limit is reached', async () => {
        // Add 5 proxies (limit is 5 forced in beforeEach)
        const batch1 = Array.from({ length: 5 }, (_, i) => ({
            full: `${i}.${i}.${i}.${i}:80`, host: 'x', port: 80
        }));
        await proxyService.add(batch1 as any);
        expect((proxyService as any).tracked.size).toBe(5);

        // Add 1 more to trigger clear
        const batch2 = [{ full: '9.9.9.9:80', host: 'y', port: 80 }];
        await proxyService.add(batch2 as any);

        // Should have cleared old ones and added new one
        expect((proxyService as any).tracked.size).toBe(1);
        expect((proxyService as any).tracked.has('9.9.9.9:80')).toBe(true);
    });
});
