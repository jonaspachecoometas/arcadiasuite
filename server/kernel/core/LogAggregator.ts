/**
 * LogAggregator - Agregador de logs do Kernel
 * Coleta, armazena e disponibiliza logs dos serviços
 */

import { EventEmitter } from 'events';
import { LogEntry, ServiceConfig } from '../types';

export interface LogAggregatorOptions {
  maxLines?: number;
  retentionHours?: number;
}

export class LogAggregator extends EventEmitter {
  private logs: LogEntry[] = [];
  private serviceBuffers: Map<string, LogEntry[]> = new Map();
  private options: Required<LogAggregatorOptions>;

  constructor(options: LogAggregatorOptions = {}) {
    super();
    this.options = {
      maxLines: 10000,
      retentionHours: 24,
      ...options,
    };

    // Limpa logs antigos periodicamente
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Adiciona uma entrada de log
   */
  add(entry: LogEntry): void {
    // Adiciona ao buffer global
    this.logs.push(entry);

    // Adiciona ao buffer do serviço
    if (!this.serviceBuffers.has(entry.serviceId)) {
      this.serviceBuffers.set(entry.serviceId, []);
    }
    this.serviceBuffers.get(entry.serviceId)!.push(entry);

    // Limita tamanho do buffer global
    if (this.logs.length > this.options.maxLines) {
      this.logs.shift();
    }

    // Limita tamanho do buffer por serviço
    const serviceLogs = this.serviceBuffers.get(entry.serviceId)!;
    if (serviceLogs.length > this.options.maxLines / 10) {
      serviceLogs.shift();
    }

    this.emit('log', entry);
  }

  /**
   * Adiciona log de sistema
   */
  system(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    this.add({
      timestamp: new Date(),
      serviceId: 'kernel',
      level,
      message,
      source: 'system',
    });
  }

  /**
   * Retorna todos os logs
   */
  getAll(options: {
    lines?: number;
    since?: Date;
    level?: 'info' | 'warn' | 'error' | 'debug';
    serviceId?: string;
  } = {}): LogEntry[] {
    let logs = options.serviceId 
      ? this.serviceBuffers.get(options.serviceId) || []
      : [...this.logs];

    if (options.since) {
      logs = logs.filter(l => l.timestamp >= options.since!);
    }

    if (options.level) {
      const levels = ['debug', 'info', 'warn', 'error'];
      const minLevel = levels.indexOf(options.level);
      logs = logs.filter(l => levels.indexOf(l.level) >= minLevel);
    }

    if (options.lines) {
      logs = logs.slice(-options.lines);
    }

    return logs;
  }

  /**
   * Retorna logs de um serviço específico
   */
  getServiceLogs(serviceId: string, lines = 100): LogEntry[] {
    const logs = this.serviceBuffers.get(serviceId) || [];
    return logs.slice(-lines);
  }

  /**
   * Retorna logs recentes (últimos N)
   */
  getRecent(count = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Retorna logs como string formatada
   */
  formatLogs(logs: LogEntry[]): string {
    return logs.map(log => this.formatEntry(log)).join('\n');
  }

  /**
   * Formata uma entrada de log
   */
  formatEntry(entry: LogEntry): string {
    const time = entry.timestamp.toISOString().split('T')[1].slice(0, 12);
    const level = entry.level.toUpperCase().padStart(5);
    const service = entry.serviceId.padEnd(20);
    return `[${time}] [${level}] [${service}] ${entry.message}`;
  }

  /**
   * Limpa logs de um serviço
   */
  clearService(serviceId: string): void {
    this.serviceBuffers.delete(serviceId);
    this.logs = this.logs.filter(l => l.serviceId !== serviceId);
  }

  /**
   * Limpa todos os logs
   */
  clearAll(): void {
    this.logs = [];
    this.serviceBuffers.clear();
    this.system('Logs limpos', 'info');
  }

  /**
   * Retorna estatísticas de logs
   */
  getStats(): {
    totalLogs: number;
    logsByService: Record<string, number>;
    logsByLevel: Record<string, number>;
  } {
    const logsByService: Record<string, number> = {};
    const logsByLevel: Record<string, number> = {};

    for (const log of this.logs) {
      logsByService[log.serviceId] = (logsByService[log.serviceId] || 0) + 1;
      logsByLevel[log.level] = (logsByLevel[log.level] || 0) + 1;
    }

    return {
      totalLogs: this.logs.length,
      logsByService,
      logsByLevel,
    };
  }

  /**
   * Stream de logs em tempo real (retorna handler para unsubscribe)
   */
  stream(callback: (entry: LogEntry) => void, options: {
    serviceId?: string;
    level?: 'info' | 'warn' | 'error' | 'debug';
  } = {}): () => void {
    const handler = (entry: LogEntry) => {
      if (options.serviceId && entry.serviceId !== options.serviceId) {
        return;
      }
      
      if (options.level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        if (levels.indexOf(entry.level) < levels.indexOf(options.level)) {
          return;
        }
      }

      callback(entry);
    };

    this.on('log', handler);
    
    return () => {
      this.off('log', handler);
    };
  }

  /**
   * Limpa logs antigos
   */
  private cleanup(): void {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - this.options.retentionHours);

    const initialCount = this.logs.length;
    this.logs = this.logs.filter(l => l.timestamp >= cutoff);

    for (const [serviceId, logs] of this.serviceBuffers) {
      this.serviceBuffers.set(serviceId, logs.filter(l => l.timestamp >= cutoff));
    }

    const removed = initialCount - this.logs.length;
    if (removed > 0) {
      this.system(`Cleanup: ${removed} logs antigos removidos`, 'debug');
    }
  }
}
