/**
 * Service Registry - Catálogo central de serviços
 * Arcadia Kernel - Módulo de Service Discovery
 */

import { EventEmitter } from 'events';
import { RegisteredService, ServiceFilter, RegistryEvent, RegistryConfig, DiscoveryProvider } from './types';
import { HealthStatus } from '../types';

export interface ServiceRegistryOptions {
  config?: Partial<RegistryConfig>;
  discoveryProviders?: DiscoveryProvider[];
}

const DEFAULT_CONFIG: RegistryConfig = {
  enableAutoDiscovery: true,
  discoveryInterval: 30000,      // 30s
  healthCheckInterval: 15000,    // 15s
  cleanupInterval: 60000,        // 1min
  maxStaleAge: 300000,           // 5min
  persistToDatabase: false,
};

export class ServiceRegistry extends EventEmitter {
  private services: Map<string, RegisteredService> = new Map();
  private config: RegistryConfig;
  private discoveryProviders: DiscoveryProvider[] = [];
  private discoveryTimer?: NodeJS.Timeout;
  private healthCheckTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(options: ServiceRegistryOptions = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...options.config };
    this.discoveryProviders = options.discoveryProviders || [];
  }

  /**
   * Inicia o registry e discovery
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    console.log('[Registry] Iniciando Service Registry...');
    
    // Verifica quais providers estão disponíveis
    const availableProviders: DiscoveryProvider[] = [];
    for (const provider of this.discoveryProviders) {
      try {
        const available = await provider.isAvailable();
        if (available) {
          availableProviders.push(provider);
          console.log(`[Registry] Provider disponível: ${provider.name}`);
        } else {
          console.log(`[Registry] Provider indisponível: ${provider.name}`);
        }
      } catch (error) {
        console.warn(`[Registry] Erro ao verificar provider ${provider.name}:`, error);
      }
    }
    this.discoveryProviders = availableProviders;

    // Executa discovery inicial
    await this.runDiscovery();

    // Inicia timers
    if (this.config.enableAutoDiscovery) {
      this.discoveryTimer = setInterval(() => this.runDiscovery(), this.config.discoveryInterval);
    }
    this.healthCheckTimer = setInterval(() => this.runHealthChecks(), this.config.healthCheckInterval);
    this.cleanupTimer = setInterval(() => this.cleanupStaleServices(), this.config.cleanupInterval);

    this.isRunning = true;
    console.log(`[Registry] Registry iniciado com ${this.services.size} serviços`);
  }

  /**
   * Para o registry
   */
  stop(): void {
    if (!this.isRunning) return;

    console.log('[Registry] Parando Service Registry...');

    if (this.discoveryTimer) clearInterval(this.discoveryTimer);
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);

    // Para os watchers dos providers
    for (const provider of this.discoveryProviders) {
      provider.stop?.();
    }

    this.isRunning = false;
    console.log('[Registry] Registry parado');
  }

  /**
   * Registra um serviço manualmente
   */
  register(service: RegisteredService): void {
    const existing = this.services.get(service.id);
    
    if (existing) {
      // Atualiza serviço existente
      this.services.set(service.id, {
        ...service,
        metadata: {
          ...service.metadata,
          lastUpdated: new Date(),
        },
      });
      this.emitEvent('service:updated', service);
    } else {
      // Novo serviço
      this.services.set(service.id, service);
      this.emitEvent('service:registered', service);
    }
  }

  /**
   * Remove um serviço do registry
   */
  unregister(serviceId: string): boolean {
    const service = this.services.get(serviceId);
    if (!service) return false;

    this.services.delete(serviceId);
    this.emitEvent('service:unregistered', undefined, serviceId);
    return true;
  }

  /**
   * Busca um serviço pelo ID
   */
  getService(serviceId: string): RegisteredService | undefined {
    return this.services.get(serviceId);
  }

  /**
   * Lista todos os serviços (com filtros opcionais)
   */
  getServices(filter?: ServiceFilter): RegisteredService[] {
    let services = Array.from(this.services.values());

    if (filter) {
      if (filter.category) {
        services = services.filter(s => s.category === filter.category);
      }
      if (filter.type) {
        services = services.filter(s => s.type === filter.type);
      }
      if (filter.requiresIA !== undefined) {
        services = services.filter(s => s.requiresIA === filter.requiresIA);
      }
      if (filter.capability) {
        services = services.filter(s => 
          s.capabilities.some(c => c.name === filter.capability)
        );
      }
      if (filter.source) {
        services = services.filter(s => s.metadata.source === filter.source);
      }
      if (filter.healthyOnly) {
        services = services.filter(s => s.healthStatus === 'healthy');
      }
    }

    return services;
  }

  /**
   * Busca serviços por categoria
   */
  getByCategory(category: string): RegisteredService[] {
    return this.getServices({ category: category as any });
  }

  /**
   * Busca serviço por capability
   */
  getByCapability(capabilityName: string): RegisteredService[] {
    return this.getServices({ capability: capabilityName });
  }

  /**
   * Atualiza status de saúde de um serviço
   */
  updateHealth(serviceId: string, status: HealthStatus): void {
    const service = this.services.get(serviceId);
    if (!service) return;

    const previousHealth = service.healthStatus;
    if (previousHealth !== status) {
      service.healthStatus = status;
      service.lastHealthCheck = new Date();
      this.emitEvent('service:health_changed', service, serviceId, previousHealth, status);
    }
  }

  /**
   * Retorna estatísticas do registry
   */
  getStats() {
    const services = Array.from(this.services.values());
    const byCategory: Record<string, number> = {};

    for (const service of services) {
      byCategory[service.category] = (byCategory[service.category] || 0) + 1;
    }

    return {
      total: services.length,
      healthy: services.filter(s => s.healthStatus === 'healthy').length,
      unhealthy: services.filter(s => s.healthStatus === 'unhealthy').length,
      unknown: services.filter(s => s.healthStatus === 'unknown').length,
      byCategory,
      bySource: this.groupBySource(services),
    };
  }

  /**
   * Executa discovery em todos os providers
   */
  private async runDiscovery(): Promise<void> {
    for (const provider of this.discoveryProviders) {
      try {
        const discoveredServices = await provider.discover();
        
        for (const service of discoveredServices) {
          const existing = this.services.get(service.id);
          if (!existing) {
            this.register(service);
          } else {
            // Atualiza metadata mas mantém health status
            this.register({
              ...service,
              healthStatus: existing.healthStatus,
              lastHealthCheck: existing.lastHealthCheck,
            });
          }
        }
      } catch (error) {
        console.error(`[Registry] Erro no discovery ${provider.name}:`, error);
      }
    }
  }

  /**
   * Executa health checks em todos os serviços
   */
  private async runHealthChecks(): Promise<void> {
    for (const service of this.services.values()) {
      // Só verifica serviços que não são externos ou que estão habilitados
      if (!service.enabled) continue;

      try {
        const isHealthy = await this.checkServiceHealth(service);
        const newStatus: HealthStatus = isHealthy ? 'healthy' : 'unhealthy';
        this.updateHealth(service.id, newStatus);
      } catch (error) {
        this.updateHealth(service.id, 'unhealthy');
      }
    }
  }

  /**
   * Verifica saúde de um serviço específico
   */
  private async checkServiceHealth(service: RegisteredService): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${service.endpoint}${service.healthCheckPath}`, {
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Remove serviços stale (sem update há muito tempo)
   */
  private cleanupStaleServices(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [id, service] of this.services) {
      // Só remove serviços descobertos automaticamente (não manuais)
      if (service.metadata.source === 'manual') continue;

      const age = now - service.metadata.lastUpdated.getTime();
      if (age > this.config.maxStaleAge) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      console.log(`[Registry] Removendo serviço stale: ${id}`);
      this.unregister(id);
    }
  }

  /**
   * Agrupa serviços por source
   */
  private groupBySource(services: RegisteredService[]): Record<string, number> {
    const result: Record<string, number> = {};
    for (const service of services) {
      const source = service.metadata.source;
      result[source] = (result[source] || 0) + 1;
    }
    return result;
  }

  /**
   * Emite evento do registry
   */
  private emitEvent(
    type: RegistryEvent['type'], 
    service?: RegisteredService, 
    serviceId?: string,
    previousHealth?: HealthStatus,
    newHealth?: HealthStatus
  ): void {
    const event: RegistryEvent = {
      type,
      timestamp: new Date(),
      serviceId: service?.id || serviceId || 'unknown',
      service,
      previousHealth,
      newHealth,
    };

    this.emit('event', event);
    this.emit(type, event);
  }

  /**
   * Adiciona um provider de discovery dinamicamente
   */
  addDiscoveryProvider(provider: DiscoveryProvider): void {
    this.discoveryProviders.push(provider);
    if (this.isRunning) {
      provider.isAvailable().then(available => {
        if (available) {
          this.runDiscovery();
        }
      });
    }
  }

  /**
   * Retorna se o registry está rodando
   */
  running(): boolean {
    return this.isRunning;
  }
}
