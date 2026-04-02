/**
 * HealthMonitor - Monitor de saúde dos serviços
 * Faz health checks HTTP periódicos nos serviços
 */

import { EventEmitter } from 'events';
import { ServiceState, HealthStatus, HealthCheckConfig } from '../types';

export interface HealthMonitorOptions {
  defaultInterval?: number;
  defaultTimeout?: number;
  defaultRetries?: number;
  onHealthChange?: (serviceId: string, health: HealthStatus, lastError?: string) => void;
}

interface HealthCheckState {
  serviceId: string;
  config: HealthCheckConfig;
  status: HealthStatus;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastCheck?: Date;
  lastError?: string;
  timer?: NodeJS.Timeout;
}

export class HealthMonitor extends EventEmitter {
  private checks: Map<string, HealthCheckState> = new Map();
  private options: Required<HealthMonitorOptions>;

  constructor(options: HealthMonitorOptions = {}) {
    super();
    this.options = {
      defaultInterval: 30000,
      defaultTimeout: 5000,
      defaultRetries: 3,
      ...options,
    };
  }

  /**
   * Inicia monitoramento de um serviço
   */
  startMonitoring(serviceId: string, state: ServiceState): void {
    if (!state.config.healthCheck) {
      return;
    }

    // Para monitoramento anterior se existir
    this.stopMonitoring(serviceId);

    const checkState: HealthCheckState = {
      serviceId,
      config: {
        interval: this.options.defaultInterval,
        timeout: this.options.defaultTimeout,
        retries: this.options.defaultRetries,
        ...state.config.healthCheck,
      },
      status: 'unknown',
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
    };

    this.checks.set(serviceId, checkState);
    
    // Primeiro check imediato
    this.performCheck(checkState);
    
    // Agenda checks periódicos
    this.scheduleNextCheck(checkState);

    this.emit('monitoring:started', { serviceId });
  }

  /**
   * Para monitoramento de um serviço
   */
  stopMonitoring(serviceId: string): void {
    const check = this.checks.get(serviceId);
    if (check) {
      if (check.timer) {
        clearTimeout(check.timer);
      }
      this.checks.delete(serviceId);
      this.emit('monitoring:stopped', { serviceId });
    }
  }

  /**
   * Para todos os monitoramentos
   */
  stopAll(): void {
    for (const [serviceId] of this.checks) {
      this.stopMonitoring(serviceId);
    }
  }

  /**
   * Retorna status de saúde de um serviço
   */
  getHealth(serviceId: string): HealthStatus {
    return this.checks.get(serviceId)?.status || 'unknown';
  }

  /**
   * Retorna todos os status
   */
  getAllHealth(): Map<string, HealthStatus> {
    const result = new Map<string, HealthStatus>();
    for (const [serviceId, check] of this.checks) {
      result.set(serviceId, check.status);
    }
    return result;
  }

  /**
   * Força um health check imediato
   */
  async forceCheck(serviceId: string): Promise<HealthStatus> {
    const check = this.checks.get(serviceId);
    if (!check) {
      return 'unknown';
    }

    await this.performCheck(check);
    return check.status;
  }

  /**
   * Executa um health check
   */
  private async performCheck(check: HealthCheckState): Promise<void> {
    const { serviceId, config } = check;
    const url = `http://localhost:${this.getServicePort(serviceId)}${config.path}`;

    check.lastCheck = new Date();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout || 5000);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        this.handleSuccess(check);
      } else {
        this.handleFailure(check, `HTTP ${response.status}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.handleFailure(check, message);
    }
  }

  /**
   * Trata sucesso do health check
   */
  private handleSuccess(check: HealthCheckState): void {
    check.consecutiveSuccesses++;
    check.consecutiveFailures = 0;
    check.lastError = undefined;

    const requiredSuccesses = 2; // Necessário 2 sucessos consecutivos para ficar healthy

    if (check.status !== 'healthy' && check.consecutiveSuccesses >= requiredSuccesses) {
      const oldStatus = check.status;
      check.status = 'healthy';
      this.emitHealthChange(check, oldStatus);
    }
  }

  /**
   * Trata falha do health check
   */
  private handleFailure(check: HealthCheckState, error: string): void {
    check.consecutiveFailures++;
    check.consecutiveSuccesses = 0;
    check.lastError = error;

    const maxFailures = check.config.retries || 3;

    if (check.status !== 'unhealthy' && check.consecutiveFailures >= maxFailures) {
      const oldStatus = check.status;
      check.status = 'unhealthy';
      this.emitHealthChange(check, oldStatus);
    }
  }

  /**
   * Emite mudança de saúde
   */
  private emitHealthChange(check: HealthCheckState, oldStatus: HealthStatus): void {
    this.emit('health:changed', {
      serviceId: check.serviceId,
      status: check.status,
      oldStatus,
      lastError: check.lastError,
    });

    if (this.options.onHealthChange) {
      this.options.onHealthChange(check.serviceId, check.status, check.lastError);
    }
  }

  /**
   * Agenda próximo check
   */
  private scheduleNextCheck(check: HealthCheckState): void {
    if (check.timer) {
      clearTimeout(check.timer);
    }

    check.timer = setTimeout(() => {
      this.performCheck(check).then(() => {
        this.scheduleNextCheck(check);
      });
    }, check.config.interval);
  }

  /**
   * Obtém porta do serviço (placeholder - deve ser integrado com ProcessManager)
   */
  private getServicePort(serviceId: string): number {
    // TODO: Integrar com ProcessManager ou config
    const ports: Record<string, number> = {
      'python-contabil': 8003,
      'python-bi': 8004,
      'python-automation': 8005,
      'node-communication': 9001,
      'node-core-api': 9002,
      'node-worker': 9003,
    };
    return ports[serviceId] || 0;
  }
}
