import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { HealthService } from './HealthService.js';
import { LoggerService } from './LoggerService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DashboardService {
    private static app = express();
    private static server = createServer(this.app);
    private static io = new Server(this.server);
    private static port = process.env.PORT || 3000;

    static async initialize() {
        // Serve static files
        const publicPath = path.join(__dirname, '../../public');
        this.app.use(express.static(publicPath));

        // API Endpoints
        this.app.get('/api/health', (req: Request, res: Response) => {
            res.json(HealthService.getStatus());
        });

        this.app.get('/api/history', async (req: Request, res: Response) => {
            try {
                const { StorageService } = await import('./StorageService.js');
                const sessions = await StorageService.listSessions();
                res.json(sessions);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch history' });
            }
        });

        this.app.get('/api/history/:id', async (req: Request, res: Response) => {
            try {
                const { StorageService } = await import('./StorageService.js');
                const results = await StorageService.getSessionResults(req.params.id as string);
                res.json(results);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch session results' });
            }
        });

        this.app.get('/api/validation/stats', async (req: Request, res: Response) => {
            try {
                const { validationPool } = await import('./ValidationWorkerPool.js');
                const stats = validationPool.getStats();
                res.json(stats);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch validation stats' });
            }
        });

        this.app.post('/api/validation/revalidate/:id', async (req: Request, res: Response) => {
            try {
                const { validationPool } = await import('./ValidationWorkerPool.js');
                // TODO: Implement revalidation logic
                res.json({ message: 'Revalidation queued', proxyId: req.params.id });
            } catch (error) {
                res.status(500).json({ error: 'Failed to queue revalidation' });
            }
        });

        // Socket.io Connection
        this.io.on('connection', (socket: any) => {
            LoggerService.info(`Dashboard client connected: ${socket.id}`);

            // Send initial health
            socket.emit('health_update', HealthService.getStatus());
        });

        this.server.listen(this.port, () => {
            LoggerService.info(`Nexus Dashboard live at http://localhost:${this.port}`);
        });

        // Initialize validation system (non-blocking)
        this.initializeValidation().catch(err => {
            LoggerService.warn(`Validation initialization failed: ${err}`);
        });

        // Periodic health updates
        setInterval(() => {
            this.io.emit('health_update', HealthService.getStatus());
        }, 5000);
    }

    static broadcastDiscovery(proxy: any) {
        this.io.emit('discovery', proxy);
    }

    static broadcastLog(level: string, message: string) {
        this.io.emit('log', { level, message, timestamp: new Date().toISOString() });
    }

    static broadcastValidation(result: any) {
        this.io.emit('validation_update', result);
    }

    static async initializeValidation() {
        try {
            const { validationPool } = await import('./ValidationWorkerPool.js');
            const { proxyValidator } = await import('./ProxyValidator.js');

            await proxyValidator.initialize();

            validationPool.on('validation_complete', (result: any) => {
                this.broadcastValidation(result);
            });

            LoggerService.info('Validation system initialized');
        } catch (error) {
            LoggerService.warn(`Validation system initialization failed: ${error}`);
        }
    }
}
