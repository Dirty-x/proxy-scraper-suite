import { LoggerService } from './LoggerService.js';
import { ConfigService } from './ConfigService.js';
import type { Proxy } from '../types/proxy.js';
import type { ValidationResult, TestResult, ValidationConfig } from '../types/validation.types.js';
import axios from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

/**
 * ProxyValidator Service
 * Validates proxies through connectivity, anonymity, speed, and geolocation tests
 */
export class ProxyValidator {
    private config: ValidationConfig;
    private realIp: string | null = null;

    constructor() {
        this.config = {
            concurrency: ConfigService.DEFAULTS.VALIDATOR_CONCURRENCY || 10,
            timeoutMs: ConfigService.DEFAULTS.VALIDATOR_TIMEOUT_MS || 10000,
            retryAttempts: ConfigService.DEFAULTS.VALIDATOR_RETRY_ATTEMPTS || 2,
            anonymityCheckUrl: ConfigService.DEFAULTS.ANONYMITY_CHECK_URL || 'https://api.ipify.org?format=json',
            speedTestUrl: ConfigService.DEFAULTS.SPEED_TEST_URL || 'https://www.google.com',
        };
    }

    /**
     * Initialize validator by detecting real IP
     */
    async initialize(): Promise<void> {
        try {
            const response = await axios.get(this.config.anonymityCheckUrl, { timeout: 5000 });
            this.realIp = response.data.ip;
            LoggerService.info(`Validator initialized. Real IP: ${this.realIp}`);
        } catch (error) {
            LoggerService.warn('Failed to detect real IP. Anonymity tests will be skipped.');
        }
    }

    /**
     * Validate a single proxy through all tests
     */
    async validateProxy(proxy: Proxy, retryCount = 0): Promise<ValidationResult> {
        const startTime = Date.now();

        LoggerService.debug(`Validating proxy: ${proxy.full}`);

        const result: ValidationResult = {
            proxy,
            passed: false,
            tests: {
                connectivity: { passed: false },
                anonymity: { passed: false },
                speed: { passed: false },
                geolocation: { passed: false },
            },
            timestamp: new Date(),
            validatedBy: 'ProxyValidator',
            retryCount,
        };

        try {
            // Test 1: Connectivity
            result.tests.connectivity = await this.testConnectivity(proxy);
            if (!result.tests.connectivity.passed) {
                return result; // Early exit if can't connect
            }

            // Test 2: Speed
            result.tests.speed = await this.testSpeed(proxy);

            // Test 3: Anonymity
            result.tests.anonymity = await this.testAnonymity(proxy);

            // Test 4: Geolocation verification
            result.tests.geolocation = await this.verifyGeolocation(proxy);

            // Proxy passes if all critical tests pass
            result.passed =
                result.tests.connectivity.passed &&
                result.tests.speed.passed &&
                result.tests.anonymity.passed;

            const duration = Date.now() - startTime;
            LoggerService.debug(
                `Validation complete for ${proxy.full}: ${result.passed ? 'PASSED' : 'FAILED'} (${duration}ms)`
            );

        } catch (error) {
            LoggerService.error(`Validation error for ${proxy.full}: ${error}`);
            result.tests.connectivity.error = String(error);
        }

        return result;
    }

    /**
     * Test if proxy is connectable
     */
    private async testConnectivity(proxy: Proxy): Promise<TestResult> {
        try {
            const agent = this.createProxyAgent(proxy);
            const startTime = Date.now();

            await axios.get('https://www.google.com', {
                httpAgent: agent,
                httpsAgent: agent,
                timeout: this.config.timeoutMs,
                maxRedirects: 0,
                validateStatus: () => true, // Accept any status code
            });

            const latency = Date.now() - startTime;

            return {
                passed: true,
                latencyMs: latency,
            };
        } catch (error: any) {
            return {
                passed: false,
                error: error.code || error.message || 'Connection failed',
            };
        }
    }

    /**
     * Test proxy anonymity by checking IP leak
     */
    private async testAnonymity(proxy: Proxy): Promise<TestResult> {
        if (!this.realIp) {
            return { passed: true, details: { skipped: true, reason: 'Real IP not detected' } };
        }

        try {
            const agent = this.createProxyAgent(proxy);
            const response = await axios.get(this.config.anonymityCheckUrl, {
                httpAgent: agent,
                httpsAgent: agent,
                timeout: this.config.timeoutMs,
            });

            const proxyIp = response.data.ip;
            const isAnonymous = proxyIp !== this.realIp;

            return {
                passed: isAnonymous,
                details: {
                    proxyIp,
                    realIp: this.realIp,
                    leaked: !isAnonymous,
                },
            };
        } catch (error: any) {
            return {
                passed: false,
                error: error.message || 'Anonymity check failed',
            };
        }
    }

    /**
     * Test proxy speed/latency
     */
    private async testSpeed(proxy: Proxy): Promise<TestResult> {
        try {
            const agent = this.createProxyAgent(proxy);
            const startTime = Date.now();

            await axios.get(this.config.speedTestUrl, {
                httpAgent: agent,
                httpsAgent: agent,
                timeout: this.config.timeoutMs,
                maxRedirects: 5,
            });

            const latency = Date.now() - startTime;
            const passed = latency < 5000; // Pass if under 5 seconds

            return {
                passed,
                latencyMs: latency,
                details: { threshold: 5000 },
            };
        } catch (error: any) {
            return {
                passed: false,
                error: error.message || 'Speed test failed',
            };
        }
    }

    /**
     * Verify geolocation matches claimed location
     */
    private async verifyGeolocation(proxy: Proxy): Promise<TestResult> {
        // For now, we trust the location data from LocationService
        // In a production system, you'd verify this against the proxy's actual IP
        if (proxy.country && proxy.countryCode) {
            return {
                passed: true,
                details: {
                    country: proxy.country,
                    countryCode: proxy.countryCode,
                    verified: false, // Not actually verified yet
                },
            };
        }

        return {
            passed: false,
            error: 'No geolocation data available',
        };
    }

    /**
     * Create appropriate proxy agent based on protocol
     */
    private createProxyAgent(proxy: Proxy): any {
        try {
            const protocol = proxy.protocol?.toLowerCase() || 'http';
            const proxyUrl = `${protocol}://${proxy.full}`;

            let agent: any;
            if (protocol.includes('socks')) {
                agent = new SocksProxyAgent(proxyUrl, {
                    timeout: this.config.timeoutMs,
                });
            } else {
                agent = new HttpsProxyAgent(proxyUrl, {
                    timeout: this.config.timeoutMs,
                });
            }

            // Prevent unhandled errors from crashing the app
            if (agent && typeof agent.on === 'function') {
                agent.on('error', (err: Error) => {
                    LoggerService.debug(`Proxy agent error for ${proxy.full}: ${err.message}`);
                });
            }

            // Handle socket-level errors for both HTTP and SOCKS agents
            const originalCreateConnection = agent.createConnection;
            const timeoutMs = this.config.timeoutMs;
            if (originalCreateConnection) {
                agent.createConnection = (options: any, callback: any) => {
                    const socket = originalCreateConnection.call(agent, options, callback);

                    if (socket && typeof socket.on === 'function') {
                        // Catch all socket errors to prevent crashes
                        socket.on('error', (err: Error) => {
                            LoggerService.debug(`Socket error for ${proxy.full}: ${err.message}`);
                            // Destroy the socket to clean up
                            socket.destroy();
                        });

                        // Handle TLS-specific errors
                        socket.on('tlsClientError', (err: Error) => {
                            LoggerService.debug(`TLS error for ${proxy.full}: ${err.message}`);
                            socket.destroy();
                        });

                        // Set a timeout on the socket itself
                        socket.setTimeout(timeoutMs, () => {
                            LoggerService.debug(`Socket timeout for ${proxy.full}`);
                            socket.destroy();
                        });
                    }

                    return socket;
                };
            }

            return agent;
        } catch (error: any) {
            LoggerService.warn(`Failed to create proxy agent for ${proxy.full}: ${error.message}`);
            return null;
        }
    }
}

export const proxyValidator = new ProxyValidator();
