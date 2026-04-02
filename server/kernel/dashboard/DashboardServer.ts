/**
 * DashboardServer - Servidor do Dashboard do Kernel
 * Interface web na porta 5001 para gerenciamento dos serviços
 */

import express, { Application, Request, Response } from 'express';
import { createServer, Server } from 'http';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ProcessManager } from '../core/ProcessManager';
import { HealthMonitor } from '../core/HealthMonitor';
import { LogAggregator } from '../core/LogAggregator';
import { KernelWebSocket } from '../websocket/KernelWebSocket';
import { createKernelRoutes } from '../api/routes';

export interface DashboardServerOptions {
  port?: number;
  host?: string;
}

export class DashboardServer {
  private app: Application;
  private server?: Server;
  private webSocket?: KernelWebSocket;
  private options: Required<DashboardServerOptions>;

  constructor(
    private processManager: ProcessManager,
    private healthMonitor: HealthMonitor,
    private logAggregator: LogAggregator,
    options: DashboardServerOptions = {}
  ) {
    this.options = {
      port: 5001,
      host: '0.0.0.0',
      ...options,
    };

    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer(this.app);

      this.webSocket = new KernelWebSocket(
        this.processManager,
        this.healthMonitor,
        this.logAggregator
      );
      this.webSocket.attach(this.server);

      this.server.listen(this.options.port, this.options.host, () => {
        console.log(`[Kernel] Dashboard em http://${this.options.host}:${this.options.port}`);
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.webSocket?.stop();
      this.server?.close(() => {
        console.log('[Kernel] Dashboard parado');
        resolve();
      });
    });
  }

  isRunning(): boolean {
    return this.server?.listening || false;
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  private setupRoutes(): void {
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'healthy', service: 'arcadia-kernel', timestamp: new Date() });
    });

    const kernelRoutes = createKernelRoutes(
      this.processManager,
      this.healthMonitor,
      this.logAggregator
    );
    this.app.use('/api/kernel', kernelRoutes);

    // Serve dashboard HTML
    // Suporte a ESM e CommonJS (build do Docker)
    const __dirname = (() => {
      try {
        return dirname(fileURLToPath(import.meta.url));
      } catch {
        // Fallback para CommonJS build
        return join(process.cwd(), 'server', 'kernel', 'dashboard');
      }
    })();
    const publicPath = join(__dirname, 'public');
    
    this.app.get('/', (req: Request, res: Response) => {
      try {
        const indexPath = join(publicPath, 'index.html');
        const html = readFileSync(indexPath, 'utf-8');
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        res.json({
          name: 'Arcadia Kernel Dashboard',
          version: '1.0.0',
          error: 'Dashboard HTML not found',
          endpoints: {
            health: '/health',
            api: '/api/kernel',
            websocket: '/ws/kernel',
          }
        });
      }
    });
  }
}
