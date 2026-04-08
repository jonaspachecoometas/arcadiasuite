/**
 * Coolify Discovery Provider
 * Descobre serviços via API do Coolify
 * 
 * Endpoints utilizados:
 * - GET /api/v1/services - Lista todos os serviços (Docker Compose)
 * - GET /api/v1/applications - Lista todas as aplicações
 * - GET /api/v1/resources - Lista todos os recursos (unificado)
 */

import { DiscoveryProvider, RegisteredService, ServiceCategory, ServiceCapability } from '../registry/types';
import { HealthStatus } from '../types';

export interface CoolifyDiscoveryOptions {
  baseUrl: string;
  token: string;
}

// Resposta da API Coolify para Services
interface CoolifyService {
  uuid: string;
  name: string;
  description?: string;
  status?: string;
  health_status?: string;
  created_at?: string;
  updated_at?: string;
  environment?: {
    uuid?: string;
    name?: string;
  };
  server?: {
    uuid?: string;
    name?: string;
  };
  // Docker Compose specific
  compose_parsing_error?: string;
  custom_labels?: string;
  // Status
  is_online?: boolean;
}

// Resposta da API Coolify para Applications
interface CoolifyApplication {
  uuid: string;
  name: string;
  status?: string;
  health_status?: string;
  ports_exposes?: string;
  custom_labels?: string;
  description?: string;
  environment?: {
    uuid?: string;
    name?: string;
  };
  server?: {
    uuid?: string;
    name?: string;
  };
}

// Resposta da API Coolify para Resources (unificado)
interface CoolifyResource {
  uuid: string;
  name: string;
  type: 'service' | 'application';
  status?: string;
  health_status?: string;
  created_at?: string;
  updated_at?: string;
}

export class CoolifyDiscovery implements DiscoveryProvider {
  public readonly name = 'CoolifyDiscovery';
  private options: CoolifyDiscoveryOptions;

  constructor(options: CoolifyDiscoveryOptions) {
    this.options = {
      baseUrl: options.baseUrl.replace(/\/$/, ''),
      token: options.token,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.options.baseUrl}/api/v1/version`, {
        headers: { 'Authorization': `Bearer ${this.options.token}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async discover(): Promise<RegisteredService[]> {
    const services: RegisteredService[] = [];

    try {
      // Busca serviços (Docker Compose)
      const coolifyServices = await this.fetchServices();
      for (const svc of coolifyServices) {
        const mapped = this.mapServiceToRegisteredService(svc);
        if (mapped) services.push(mapped);
      }

      // Busca aplicações
      const coolifyApps = await this.fetchApplications();
      for (const app of coolifyApps) {
        const mapped = this.mapApplicationToRegisteredService(app);
        if (mapped) services.push(mapped);
      }

      console.log(`[CoolifyDiscovery] Descobertos ${services.length} serviços`);
      return services;
    } catch (error) {
      console.error('[CoolifyDiscovery] Erro ao descobrir serviços:', error);
      return [];
    }
  }

  private async fetchServices(): Promise<CoolifyService[]> {
    try {
      console.log(`[CoolifyDiscovery] Buscando serviços em ${this.options.baseUrl}/api/v1/services`);
      const response = await fetch(`${this.options.baseUrl}/api/v1/services`, {
        headers: { 
          'Authorization': `Bearer ${this.options.token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log(`[CoolifyDiscovery] Response status: ${response.status}`);

      if (!response.ok) {
        console.warn(`[CoolifyDiscovery] API retornou ${response.status} para /services`);
        return [];
      }

      const data = await response.json();
      console.log(`[CoolifyDiscovery] Recebidos ${Array.isArray(data) ? data.length : 0} serviços`);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('[CoolifyDiscovery] Erro ao buscar services:', error);
      return [];
    }
  }

  private async fetchApplications(): Promise<CoolifyApplication[]> {
    try {
      const response = await fetch(`${this.options.baseUrl}/api/v1/applications`, {
        headers: { 
          'Authorization': `Bearer ${this.options.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`[CoolifyDiscovery] API retornou ${response.status} para /applications`);
        return [];
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('[CoolifyDiscovery] Erro ao buscar applications:', error);
      return [];
    }
  }

  private mapServiceToRegisteredService(svc: CoolifyService): RegisteredService | null {
    // Parse custom labels se existirem
    const labels = this.parseLabels(svc.custom_labels);
    
    // Só registra se tiver o label arcadia.discovery.enabled=true
    if (labels['arcadia.discovery.enabled'] !== 'true') {
      return null;
    }

    const id = labels['arcadia.id'] || `coolify-service-${svc.uuid}`;
    const name = labels['arcadia.name'] || svc.name;
    const type = labels['arcadia.type'] || 'docker';
    const category = (labels['arcadia.category'] as ServiceCategory) || 'core';
    const port = parseInt(labels['arcadia.port'] || '80', 10);
    
    // Determina health status
    let healthStatus: HealthStatus = 'unknown';
    if (svc.health_status === 'healthy' || svc.is_online) {
      healthStatus = 'healthy';
    } else if (svc.health_status === 'unhealthy') {
      healthStatus = 'unhealthy';
    }

    // Parse capabilities
    const capabilities: ServiceCapability[] = [];
    if (labels['arcadia.capabilities']) {
      const caps = labels['arcadia.capabilities'].split(',');
      for (const cap of caps) {
        capabilities.push({
          name: cap.trim(),
          version: '1.0',
          endpoints: [],
        });
      }
    }

    // Determina o host baseado no nome do serviço
    // Coolify cria containers com nomes como: {project}-{service}-{random}
    const host = this.inferHostFromName(svc.name);

    return {
      id,
      name: svc.name,
      displayName: name,
      type: type as any,
      category,
      description: svc.description || labels['arcadia.description'] || `Serviço Coolify: ${svc.name}`,
      host,
      port,
      endpoint: `http://${host}:${port}`,
      healthCheckPath: labels['arcadia.healthPath'] || '/health',
      healthStatus,
      lastHealthCheck: new Date(),
      capabilities,
      requiresIA: labels['arcadia.requires_ia'] === 'true',
      iaPolicies: labels['arcadia.ia_policies']?.split(',') || [],
      metadata: {
        source: 'docker' as const,  // Usamos 'docker' como source para compatibilidade
        discoveredAt: new Date(),
        lastUpdated: new Date(),
        labels,
        dockerContainerId: undefined,  // Coolify não expõe isso diretamente
        dockerImage: undefined,
      },
      enabled: true,
      version: labels['arcadia.version'] || '1.0.0',
    };
  }

  private mapApplicationToRegisteredService(app: CoolifyApplication): RegisteredService | null {
    // Parse custom labels se existirem
    const labels = this.parseLabels(app.custom_labels);
    
    // Só registra se tiver o label arcadia.discovery.enabled=true
    if (labels['arcadia.discovery.enabled'] !== 'true') {
      return null;
    }

    const id = labels['arcadia.id'] || `coolify-app-${app.uuid}`;
    const name = labels['arcadia.name'] || app.name;
    const type = labels['arcadia.type'] || 'node';
    const category = (labels['arcadia.category'] as ServiceCategory) || 'core';
    
    // Parse port das ports_exposes (formato: "8080:80,9000:9000")
    let port = 80;
    if (app.ports_exposes) {
      const firstPort = app.ports_exposes.split(',')[0];
      const exposed = firstPort.split(':')[0];
      port = parseInt(exposed, 10) || 80;
    }
    if (labels['arcadia.port']) {
      port = parseInt(labels['arcadia.port'], 10);
    }

    // Determina health status
    let healthStatus: HealthStatus = 'unknown';
    if (app.health_status === 'healthy') {
      healthStatus = 'healthy';
    } else if (app.health_status === 'unhealthy') {
      healthStatus = 'unhealthy';
    }

    // Parse capabilities
    const capabilities: ServiceCapability[] = [];
    if (labels['arcadia.capabilities']) {
      const caps = labels['arcadia.capabilities'].split(',');
      for (const cap of caps) {
        capabilities.push({
          name: cap.trim(),
          version: '1.0',
          endpoints: [],
        });
      }
    }

    const host = this.inferHostFromName(app.name);

    return {
      id,
      name: app.name,
      displayName: name,
      type: type as any,
      category,
      description: app.description || labels['arcadia.description'] || `Aplicação Coolify: ${app.name}`,
      host,
      port,
      endpoint: `http://${host}:${port}`,
      healthCheckPath: labels['arcadia.healthPath'] || '/health',
      healthStatus,
      lastHealthCheck: new Date(),
      capabilities,
      requiresIA: labels['arcadia.requires_ia'] === 'true',
      iaPolicies: labels['arcadia.ia_policies']?.split(',') || [],
      metadata: {
        source: 'docker' as const,
        discoveredAt: new Date(),
        lastUpdated: new Date(),
        labels,
      },
      enabled: true,
      version: labels['arcadia.version'] || '1.0.0',
    };
  }

  private parseLabels(labelsString?: string): Record<string, string> {
    if (!labelsString) return {};
    
    const labels: Record<string, string> = {};
    const lines = labelsString.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim();
        let value = trimmed.substring(eqIndex + 1).trim();
        // Remove quotes se existirem
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        labels[key] = value;
      }
    }
    
    return labels;
  }

  private inferHostFromName(name: string): string {
    // Coolify geralmente cria containers com nomes baseados no projeto e serviço
    // Ex: arcadia-prod-metaset-1, arcadia-prod-app-1
    // Vamos tentar inferir o hostname baseado em convenções comuns
    
    // Se o nome já parece ser um hostname, usa ele
    if (name.includes('.') || name.includes('-')) {
      // Remove sufixos numéricos de containers (ex: -1, -2)
      return name.replace(/-\d+$/, '');
    }
    
    return name;
  }
}
