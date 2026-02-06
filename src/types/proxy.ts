export type Proxy = {
    country: string | null;
    protocol: string | null;
    anonymity: string | null;
    host: string;
    port: string;
    full: string;
    countryCode?: string | null;
    region?: string | null;
    city?: string | null;
    isp?: string | null;
    source?: string | null;
};
