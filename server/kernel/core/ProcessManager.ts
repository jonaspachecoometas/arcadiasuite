/**
 * ProcessManager - Gerenciador de processos do Kernel
 * Responsável por spawn, monitoramento e controle de serviços
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import {
  ServiceConfig,
  ServiceState,
  ServiceStatus,
  HealthStatus,
  LogEntry,
} from '../types';

export interface ProcessManagerOptions {
  onLog?: (entry: LogEntry) => void;
  onStateChange?: (serviceId: string, state: ServiceState) => void;
  onHealthChange?: (serviceId: string, health: HealthStatus) => void;
}

export class ProcessManager extends EventEmitter {
  private services: Map<string, ServiceState> = new Map();
  private processes: Map<string, ChildProcess> = new Map();
  private options: ProcessManagerOptions;

  constructor(options: ProcessManagerOptions = {}) {
    super();
    this.options = options;
  }

  /**
   * Registra um serviço no manager (sem iniciar)
   */
  registerService(config: ServiceConfig): ServiceState {
    const state: ServiceState = {
      config,
      status: 'stopped',
      health: 'unknown',
      restartCount: 0,
    };

    this.services.set(config.id, state);
    this.emit('service:registered', { serviceId: config.id, state });
    
    return state;
  }

  /**
   * Inicia um serviço
   */
  async startService(serviceId: string): Promise<ServiceState> {
    const state = this.services.get(serviceId);
    if (!state) {
      throw new Error(`Serviço ${serviceId} não encontrado`);
    }

    if (state.status === 'running' || state.status === 'starting') {
      return state;
    }

    state.status = 'starting';
    this.emitStateChange(serviceId, state);

    try {
      const process = this.spawnProcess(state.config);
      this.processes.set(serviceId, process);
      
      state.pid = process.pid;
      state.status = 'running';
      state.startTime = new Date();
      state.lastError = undefined;
      
      this.setupProcessHandlers(serviceId, process);
      this.emit('service:started', { serviceId, state });
      
      return state;
    } catch (error) {
      state.status = 'error';
      state.lastError = error instanceof Error ? error.message : String(error);
      this.emitStateChange(serviceId, state);
      throw error;
    }
  }

  /**
   * Para um serviço
   */
  async stopService(serviceId: string, force = false): Promise<ServiceState> {
    const state = this.services.get(serviceId);
    if (!state) {
      throw new Error(`Serviço ${serviceId} não encontrado`);
    }

    if (state.status === 'stopped' || state.status === 'stopping') {
      return state;
    }

    state.status = 'stopping';
    this.emitStateChange(serviceId, state);

    const process = this.processes.get(serviceId);
    if (process) {
      if (force) {
        process.kill('SIGKILL');
      } else {
        process.kill('SIGTERM');
        
        // Aguarda 5s antes de forçar
        setTimeout(() => {
          if (!process.killed) {
            process.kill('SIGKILL');
          }
        }, 5000);
      }
    }

    return state;
  }

  /**
   * Reinicia um serviço
   */
  async restartService(serviceId: string): Promise<ServiceState> {
    const state = this.services.get(serviceId);
    if (!state) {
      throw new Error(`Serviço ${serviceId} não encontrado`);
    }

    state.status = 'restarting';
    this.emitStateChange(serviceId, state);

    await this.stopService(serviceId);
    
    // Aguarda processo parar completamente
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return this.startService(serviceId);
  }

  /**
   * Mata um serviço (force kill)
   */
  async killService(serviceId: string): Promise<ServiceState> {
    return this.stopService(serviceId, true);
  }

  /**
   * Inicia todos os serviços com autoStart
   */
  async startAll(autoOnly = true): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const [serviceId, state] of this.services) {
      if (autoOnly && !state.config.autoStart) {
        continue;
      }
      
      promises.push(
        this.startService(serviceId)
          .then(() => {
            this.log('system', serviceId, 'info', `Serviço ${state.config.name} iniciado`);
          })
          .catch(error => {
            this.log('system', serviceId, 'error', `Falha ao iniciar ${state.config.name}: ${error.message}`);
          })
      );
    }

    await Promise.all(promises);
  }

  /**
   * Para todos os serviços
   */
  async stopAll(force = false): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const [serviceId, state] of this.services) {
      if (state.status === 'running' || state.status === 'starting') {
        promises.push(
          this.stopService(serviceId, force)
            .catch(error => {
              this.log('system', serviceId, 'error', `Erro ao parar serviço: ${error.message}`);
            })
        );
      }
    }

    await Promise.all(promises);
  }

  /**
   * Retorna estado de um serviço
   */
  getServiceState(serviceId: string): ServiceState | undefined {
    return this.services.get(serviceId);
  }

  /**
   * Retorna todos os estados
   */
  getAllStates(): ServiceState[] {
    return Array.from(this.services.values());
  }

  /**
   * Retorna processo de um serviço
   */
  getProcess(serviceId: string): ChildProcess | undefined {
    return this.processes.get(serviceId);
  }

  /**
   * Verifica se serviço está rodando
   */
  isRunning(serviceId: string): boolean {
    const state = this.services.get(serviceId);
    return state?.status === 'running';
  }

  /**
   * Atualiza health status de um serviço
   */
  setHealth(serviceId: string, health: HealthStatus): void {
    const state = this.services.get(serviceId);
    if (state && state.health !== health) {
      state.health = health;
      this.emit('service:health_changed', { serviceId, health });
      
      if (this.options.onHealthChange) {
        this.options.onHealthChange(serviceId, health);
      }
    }
  }

  /**
   * Spawna um processo
   */
  private spawnProcess(config: ServiceConfig): ChildProcess {
    const cwd = config.cwd 
      ? path.resolve(process.cwd(), config.cwd)
      : process.cwd();

    const env = {
      ...process.env,
      ...config.env,
    };

    const process_ = spawn(config.command, config.args, {
      cwd,
      env,
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (!process_.pid) {
      throw new Error(`Falha ao spawnar processo ${config.name}`);
    }

    return process_;
  }

  /**
   * Configura handlers de processo
   */
  private setupProcessHandlers(serviceId: string, process: ChildProcess): void {
    const state = this.services.get(serviceId)!;

    // stdout
    process.stdout?.on('data', (data: Buffer) => {
      const message = data.toString().trim();
      if (message) {
        state.lastLog = message;
        this.log('stdout', serviceId, 'info', message);
      }
    });

    // stderr
    process.stderr?.on('data', (data: Buffer) => {
      const message = data.toString().trim();
      if (message) {
        this.log('stderr', serviceId, 'error', message);
      }
    });

    // exit
    process.on('exit', (code: number | null, signal: string | null) => {
      this.processes.delete(serviceId);
      
      const wasRunning = state.status === 'running';
      state.status = 'stopped';
      state.pid = undefined;
      
      this.emitStateChange(serviceId, state);
      this.emit('service:stopped', { serviceId, code, signal });

      // Auto-restart se saiu com erro
      if (wasRunning && code !== 0 && state.restartCount < (state.config.maxRestarts || 3)) {
        state.restartCount++;
        this.log('system', serviceId, 'warn', `Serviço parou (código ${code}). Reiniciando... (tentativa ${state.restartCount})`);
        
        setTimeout(() => {
          this.startService(serviceId).catch(() => {});
        }, 2000);
      }
    });

    // error
    process.on('error', (error: Error) => {
      state.lastError = error.message;
      this.log('system', serviceId, 'error', `Erro no processo: ${error.message}`);
    });
  }

  /**
   * Emite log
   */
  private log(source: 'stdout' | 'stderr' | 'system', serviceId: string, level: 'info' | 'warn' | 'error' | 'debug', message: string): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      serviceId,
      level,
      message,
      source,
    };

    this.emit('log', entry);

    if (this.options.onLog) {
      this.options.onLog(entry);
    }
  }

  /**
   * Emite mudança de estado
   */
  private emitStateChange(serviceId: string, state: ServiceState): void {
    this.emit('service:state_changed', { serviceId, state });

    if (this.options.onStateChange) {
      this.options.onStateChange(serviceId, state);
    }
  }
}
