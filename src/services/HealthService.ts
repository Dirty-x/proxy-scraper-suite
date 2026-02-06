import { LoggerService } from './LoggerService.js';
import os from 'os';

export class HealthService {
    private static startTime = Date.now();

    static getStatus() {
        const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
        const memUsage = process.memoryUsage();

        return {
            status: 'ok',
            uptime: `${uptimeSeconds}s`,
            memory: {
                rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
                heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
            },
            system: {
                load: os.loadavg(),
                freeMem: `${Math.round(os.freemem() / 1024 / 1024)}MB`,
            }
        };
    }

    static logHealth() {
        const health = this.getStatus();
        LoggerService.info('System Health Check', health);
    }
}
