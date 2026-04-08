/**
 * Tipos para Service Discovery e Registry
 * Arcadia Kernel - Service Registry Module
 */

import { HealthStatus } from '../types';

// Tipos de fonte de descoberta
export type DiscoverySource = 'docker' | 'manual' | 'xos' | 'consul' | 'kubernetes' | 'coolify';

// Categoria do serviço
export type ServiceCategory = 
  | 'erp' 
  | 'fiscal' 
  | 'contabil' 
  | 'bi' 
  | 'data' 
  | 'automation' 
  | 'communication' 
  | 'intelligence'
  | 'ai'
  | 'core';

// Capacidades que um serviço pode ter
export interface ServiceCapability {
  name: string;
  version: string;
  endpoints: string[];
  description?: string;
}

// Metadados de um serviço
export interface ServiceMetadata {
  source: DiscoverySource;
  discoveredAt: Date;
  lastUpdated: Date;
  labels: Record<string, string>;
  dockerContainerId?: string;
  dockerImage?: string;
  networkAliases?: string[];
}

// Definição de um serviço no registry
export interface RegisteredService {
  id: string;
  name: string;
  displayName: string;
  type: 'python' | 'node' | 'java' | 'go' | 'rust' | 'docker';
  category: ServiceCategory;
  description?: string;
  
  // Endereçamento
  host: string;
  port: number;
  endpoint: string;  // URL completa: http://host:port
  
  // Health check
  healthCheckPath: string;
  healthStatus: HealthStatus;
  lastHealthCheck?: Date;
  
  // Capacidades
  capabilities: ServiceCapability[];
  requiresIA: boolean;
  iaPolicies?: string[];  // Ex: ['fiscal', 'lgpd']
  
  // Metadata
  metadata: ServiceMetadata;
  
  // Estado
  enabled: boolean;
  version?: string;
}

// Filtros para busca de serviços
export interface ServiceFilter {
  category?: ServiceCategory;
  type?: string;
  requiresIA?: boolean;
  capability?: string;
  source?: DiscoverySource;
  healthyOnly?: boolean;
}

// Evento de mudança no registry
export interface RegistryEvent {
  type: 'service:registered' | 'service:unregistered' | 'service:updated' | 'service:health_changed';
  timestamp: Date;
  serviceId: string;
  service?: RegisteredService;
  previousHealth?: HealthStatus;
  newHealth?: HealthStatus;
}

// Configuração do registry
export interface RegistryConfig {
  enableAutoDiscovery: boolean;
  discoveryInterval: number;  // ms
  healthCheckInterval: number;  // ms
  cleanupInterval: number;  // ms
  maxStaleAge: number;  // ms - tempo máximo sem health check
  persistToDatabase: boolean;
}

// Interface para descoberta (Docker, XOS, etc)
export interface DiscoveryProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  discover(): Promise<RegisteredService[]>;
  watch?(callback: (services: RegisteredService[]) => void): void;
  stop?(): void;
}

// Docker-specific types
export interface DockerLabelConfig {
  enabled: boolean;
  name: string;
  type: string;
  category: ServiceCategory;
  port: number;
  capabilities?: string;  // JSON string
  requiresIA?: boolean;
  iaPolicies?: string;    // Comma-separated
  healthCheckPath?: string;
  description?: string;
  version?: string;
}

// Resposta da API de registry
export interface RegistryApiResponse {
  services: RegisteredService[];
  total: number;
  healthy: number;
  unhealthy: number;
  byCategory: Record<ServiceCategory, number>;
}
