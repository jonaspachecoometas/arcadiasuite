/**
 * Arcadia Kernel - Entry Point
 * Sistema nativo de gerenciamento de serviços
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ProcessManager } from './core/ProcessManager';
import { HealthMonitor } from './core/HealthMonitor';
import { LogAggregator } from './core/LogAggregator';
import { DashboardServer } from './dashboard/DashboardServer';
import { ServiceConfig, ServiceState } from './types';

// Suporte a ESM e CommonJS (build do Docker)
const __dirname = (() => {
  try {
    return dirname(fileURLToPath(import.meta.url));
  } catch {
    // Fallback para CommonJS build
    return join(process.cwd(), 'server', 'kernel');
  }
})();

export interface KernelOptions {
  configPath?: string;
  dashboard?: {
    enabled?: boolean;
    port?: number;
    host?: string;
  };
  autoStart?: boolean;
}

export class ArcadiaKernel {
  public processManager: ProcessManager;
  public healthMonitor: HealthMonitor;
  public logAggregator: LogAggregator;
  public dashboard?: DashboardServer;
  
  private options: Required<KernelOptions>;
  private services: ServiceConfig[] = [];
  private started = false;

  constructor(options: KernelOptions = {}) {
    this.options = {
      configPath: join(__dirname, 'config', 'services.json'),
      dashboard: {
        enabled: true,
        port: 5001,
        host: '0.0.0.0',
      },
      autoStart: false,
      ...options,
    };

    // Inicializa componentes
    this.logAggregator = new LogAggregator({ maxLines: 10000 });
    
    this.processManager = new ProcessManager({
      onLog: (entry) => this.logAggregator.add(entry),
      onStateChange: (serviceId, state) => {
        console.log(`[Kernel] ${serviceId}: ${state.status}`);
      },
      onHealthChange: (serviceId, health) => {
        console.log(`[Kernel] ${serviceId} health: ${health}`);
      },
    });

    this.healthMonitor = new HealthMonitor({
      onHealthChange: (serviceId, health, error) => {
        this.processManager.setHealth(serviceId, health);
        if (error) {
          console.log(`[Kernel] ${serviceId} health error: ${error}`);
        }
      },
    });

    // Carrega configurações
    this.loadConfig();
  }

  /**
   * Inicia o Kernel
   */
  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    console.log('[Kernel] Iniciando Arcadia Kernel...');
    console.log(`[Kernel] ${this.services.length} serviços registrados`);

    // Registra serviços no ProcessManager
    for (const config of this.services) {
      this.processManager.registerService(config);
    }

    // Inicia Dashboard
    if (this.options.dashboard.enabled) {
      this.dashboard = new DashboardServer(
        this.processManager,
        this.healthMonitor,
        this.logAggregator,
        {
          port: this.options.dashboard.port,
          host: this.options.dashboard.host,
        }
      );
      await this.dashboard.start();
    }

    // Auto-start serviços
    if (this.options.autoStart) {
      console.log('[Kernel] Auto-iniciando serviços...');
      await this.processManager.startAll(true);
      
      // Inicia health monitoring para serviços em execução
      for (const state of this.processManager.getAllStates()) {
        if (state.status === 'running') {
          this.healthMonitor.startMonitoring(state.config.id, state);
        }
      }
    }

    this.started = true;
    console.log('[Kernel] Kernel iniciado com sucesso!');
    
    // Eventos de shutdown
    this.setupShutdownHandlers();
  }

  /**
   * Para o Kernel
   */
  async stop(): Promise<void> {
    if (!this.started) {
      return;
    }

    console.log('[Kernel] Parando Kernel...');

    // Para health monitor
    this.healthMonitor.stopAll();

    // Para todos os serviços
    await this.processManager.stopAll(true);

    // Para dashboard
    await this.dashboard?.stop();

    this.started = false;
    console.log('[Kernel] Kernel parado.');
  }

  /**
   * Retorna se o kernel está rodando
   */
  isRunning(): boolean {
    return this.started;
  }

  /**
   * Carrega configurações dos serviços
   */
  private loadConfig(): void {
    try {
      const configData = readFileSync(this.options.configPath, 'utf-8');
      const config = JSON.parse(configData);
      this.services = config.services || [];
    } catch (error) {
      console.error('[Kernel] Erro ao carregar config:', error);
      this.services = [];
    }
  }

  /**
   * Configura handlers de shutdown
   */
  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      console.log(`\n[Kernel] Sinal ${signal} recebido. Desligando...`);
      await this.stop();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    process.on('uncaughtException', (error) => {
      console.error('[Kernel] Uncaught Exception:', error);
    });
    
    process.on('unhandledRejection', (reason) => {
      console.error('[Kernel] Unhandled Rejection:', reason);
    });
  }
}

// Exporta componentes individuais
export { ProcessManager } from './core/ProcessManager';
export { HealthMonitor } from './core/HealthMonitor';
export { LogAggregator } from './core/LogAggregator';
export { DashboardServer } from './dashboard/DashboardServer';
export { KernelWebSocket } from './websocket/KernelWebSocket';
export { createKernelRoutes } from './api/routes';
export * from './types';

// Entry point para execução direta
// Protegido para funcionar no build CommonJS do Docker
try {
  if (import.meta.url && import.meta.url === `file://${process.argv[1]}`) {
    const kernel = new ArcadiaKernel({
      dashboard: { enabled: true, port: 5001 },
      autoStart: true,
    });

    kernel.start().catch((error) => {
      console.error('[Kernel] Falha ao iniciar:', error);
      process.exit(1);
    });
  }
} catch {
  // No build CommonJS, o Kernel é iniciado pelo server/index.ts
}
