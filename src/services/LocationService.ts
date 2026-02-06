import { log } from 'crawlee';
import { StorageService } from './StorageService.js';

export interface LocationData {
    country: string;
    countryCode: string;
    region: string;
    city: string;
    isp: string;
    query: string;
}

/**
 * Enterprise Location Service
 * Fetches geographic data for proxies using free GeoIP APIs.
 * Includes local caching to minimize API usage.
 */
export class LocationService {
    private static CACHE_KEY_PREFIX = 'GEO-';

    /**
     * Enrich a proxy with location data
     */
    static async getProxyLocation(ip: string): Promise<Partial<LocationData> | null> {
        // 1. Check local cache first
        const cacheKey = `${this.CACHE_KEY_PREFIX}${ip}`;
        const cached = await StorageService.getCache<LocationData>(cacheKey);
        if (cached) return cached;

        // 2. Fetch from free API (ip-api.com) with timeout
        try {
            log.debug(`Fetching location for IP: ${ip}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

            const response = await fetch(
                `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,regionName,city,isp,query`,
                { signal: controller.signal }
            );

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.status === 'success') {
                const location = {
                    country: data.country,
                    countryCode: data.countryCode,
                    region: data.regionName,
                    city: data.city,
                    isp: data.isp,
                    query: data.query
                };

                // 3. Save to cache
                await StorageService.setCache(cacheKey, location);
                return location;
            }
        } catch (error: any) {
            // Don't crash on errors, just log and return null
            if (error.name !== 'AbortError') {
                log.warning(`Failed to fetch location for ${ip}: ${error.message || 'Unknown error'}`);
            }
        }

        return null;
    }
}
