/**
 * Static Discovery Provider
 * Descobre serviços pela rede Docker interna (DNS)
 * Arcadia Kernel - Módulo de Service Discovery
 */

import { DiscoveryProvider, RegisteredService, ServiceCategory } from '../registry/types';
import { HealthStatus } from '../types';

// Lista de serviços Arcádia conhecidos
const ARCADIA_SERVICES = [
  {
    id: 'motor-contabil',
    name: 'motor-contabil',
    displayName: 'Motor Contábil',
    type: 'python' as const,
    category: 'contabil' as ServiceCategory,
    host: 'arcadia-prod-contabil-1',
    port: 8003,
    capabilities: ['lancamentos', 'dre', 'balancete', 'razao'],
    requiresIA: false,
    description: 'Contabilidade - Lançamentos, DRE, Balancete, Razão',
  },
  {
    id: 'motor-bi',
    name: 'motor-bi',
    displayName: 'Motor BI',
    type: 'python' as const,
    category: 'bi' as ServiceCategory,
    host: 'arcadia-prod-bi-1',
    port: 8004,
    capabilities: ['sql', 'charts', 'microbi', 'cache'],
    requiresIA: true,
    iaPolicies: ['bi', 'lgpd'],
    description: 'Business Intelligence - SQL, Charts, Micro-BI, Cache',
  },
  {
    id: 'motor-fiscal',
    name: 'motor-fiscal',
    displayName: 'Motor Fiscal',
    type: 'python' as const,
    category: 'fiscal' as ServiceCategory,
    host: 'arcadia-prod-fisco-1',
    port: 8002,
    capabilities: ['nfe', 'nfce', 'ncm', 'cfop', 'cest', 'sefaz'],
    requiresIA: true,
    iaPolicies: ['fiscal'],
    description: 'NF-e/NFC-e - NCMs, CFOPs, CESTs, SEFAZ',
  },
  {
    id: 'motor-automacao',
    name: 'motor-automacao',
    displayName: 'Motor Automação',
    type: 'python' as const,
    category: 'automation' as ServiceCategory,
    host: 'arcadia-prod-automation-1',
    port: 8005,
    capabilities: ['scheduler', 'eventbus', 'workflow'],
    requiresIA: true,
    iaPolicies: ['automation'],
    description: 'Scheduler, Event Bus, Workflow Executor',
  },
  {
    id: 'servico-embeddings',
    name: 'servico-embeddings',
    displayName: 'Serviço Embeddings',
    type: 'python' as const,
    category: 'ai' as ServiceCategory,
    host: 'arcadia-prod-embeddings-1',
    port: 8001,
    capabilities: ['embeddings', 'vectorsearch'],
    requiresIA: true,
    iaPolicies: ['ai', 'lgpd'],
    description: 'Embeddings e Vector Search com pgvector',
  },
  {
    id: 'metaset-bi',
    name: 'metaset-bi',
    displayName: 'MetaSet BI',
    type: 'java' as const,
    category: 'data' as ServiceCategory,
    host: 'arcadia-prod-superset-1',
    port: 8088,
    capabilities: ['dashboards', 'charts', 'sql_lab', 'datasets'],
    requiresIA: false,
    description: 'Motor de BI - Consultas, Dashboards, Gráficos, Análises',
    version: '4.1.0',
  },
  {
    id: 'motor-comunicacao',
    name: 'motor-comunicacao',
    displayName: 'Motor Comunicação',
    type: 'node' as const,
    category: 'communication' as ServiceCategory,
    host: 'arcadia-prod-miroflow-1',
    port: 8006,
    capabilities: ['inbox', 'whatsapp', 'canais'],
    requiresIA: true,
    iaPolicies: ['communication'],
    description: 'Inbox Unificada, Contatos, Threads, Canais',
  },
];

export class StaticDiscovery implements DiscoveryProvider {
  public readonly name = 'StaticDiscovery';

  async isAvailable(): Promise<boolean> {
    // Sempre disponível - não depende de Docker
    return true;
  }

  async discover(): Promise<RegisteredService[]> {
    const services: RegisteredService[] = [];
    const now = new Date();

    for (const config of ARCADIA_SERVICES) {
      try {
        // Tenta fazer health check no serviço
        const isHealthy = await this.checkHealth(config.host, config.port);
        
        if (isHealthy) {
          services.push({
            id: `static-${config.id}`,
            name: config.name,
            displayName: config.displayName,
            type: config.type,
            category: config.category,
            description: config.description,
            host: config.host,
            port: config.port,
            endpoint: `http://${config.host}:${config.port}`,
            healthCheckPath: '/health',
            healthStatus: 'healthy' as HealthStatus,
            lastHealthCheck: now,
            capabilities: config.capabilities.map(cap => ({
              name: cap,
              version: '1.0.0',
              endpoints: [`/${cap}`],
            })),
            requiresIA: config.requiresIA,
            iaPolicies: config.iaPolicies,
            metadata: {
              source: 'static',
              discoveredAt: now,
              lastUpdated: now,
              labels: {},
            },
            enabled: true,
            version: config.version,
          });
        }
      } catch (error) {
        // Serviço não respondeu, não adiciona
        console.log(`[StaticDiscovery] ${config.displayName} não respondeu`);
      }
    }

    return services;
  }

  private async checkHealth(host: string, port: number): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`http://${host}:${port}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }
}
