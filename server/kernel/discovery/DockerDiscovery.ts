/**
 * Docker Discovery Provider
 * Descobre serviços via labels em containers Docker
 * Arcadia Kernel - Módulo de Service Discovery
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { DiscoveryProvider, RegisteredService, DockerLabelConfig, ServiceCapability, ServiceCategory } from '../registry/types';
import { HealthStatus } from '../types';

const execAsync = promisify(exec);

// Prefixo para labels do Arcadia
const LABEL_PREFIX = 'arcadia.';

// Labels suportados
const LABELS = {
  ENABLED: `${LABEL_PREFIX}discovery.enabled`,
  NAME: `${LABEL_PREFIX}name`,
  TYPE: `${LABEL_PREFIX}type`,
  CATEGORY: `${LABEL_PREFIX}category`,
  PORT: `${LABEL_PREFIX}port`,
  CAPABILITIES: `${LABEL_PREFIX}capabilities`,
  REQUIRES_IA: `${LABEL_PREFIX}requires_ia`,
  IA_POLICIES: `${LABEL_PREFIX}ia_policies`,
  HEALTH_PATH: `${LABEL_PREFIX}health_path`,
  DESCRIPTION: `${LABEL_PREFIX}description`,
  VERSION: `${LABEL_PREFIX}version`,
} as const;

export interface DockerDiscoveryOptions {
  labelFilter?: string;
  networkName?: string;
}

export class DockerDiscovery implements DiscoveryProvider {
  public readonly name = 'DockerDiscovery';
  private options: DockerDiscoveryOptions;
  private isDockerAvailable = false;

  constructor(options: DockerDiscoveryOptions = {}) {
    this.options = {
      networkName: 'arcadia',
      ...options,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      await execAsync('docker ps --format "{{.ID}}" | head -1');
      this.isDockerAvailable = true;
      return true;
    } catch {
      this.isDockerAvailable = false;
      return false;
    }
  }

  async discover(): Promise<RegisteredService[]> {
    if (!this.isDockerAvailable) {
      throw new Error('Docker não está disponível');
    }

    try {
      const { stdout } = await execAsync(
        `docker ps --filter "label=${LABELS.ENABLED}=true" --format "{{.ID}}"`
      );

      const containerIds = stdout.trim().split('\n').filter(id => id);
      
      if (containerIds.length === 0) {
        return [];
      }

      const services: RegisteredService[] = [];

      for (const containerId of containerIds) {
        try {
          const service = await this.parseContainer(containerId);
          if (service) {
            services.push(service);
          }
        } catch (error) {
          console.warn(`[DockerDiscovery] Erro ao parsear container ${containerId}:`, error);
        }
      }

      return services;
    } catch (error) {
      console.error('[DockerDiscovery] Erro ao descobrir serviços:', error);
      return [];
    }
  }

  private async parseContainer(containerId: string): Promise<RegisteredService | null> {
    const { stdout: labelsJson } = await execAsync(
      `docker inspect --format='{{json .Config.Labels}}' ${containerId}`
    );

    const labels: Record<string, string> = JSON.parse(labelsJson);

    if (labels[LABELS.ENABLED] !== 'true') {
      return null;
    }

    const config = this.extractConfig(labels);
    if (!config.name || !config.port) {
      console.warn(`[DockerDiscovery] Container ${containerId} não tem name ou port configurados`);
      return null;
    }

    const { stdout: containerJson } = await execAsync(
      `docker inspect --format='{{json .}}' ${containerId}`
    );
    const containerInfo = JSON.parse(containerJson);

    const hostname = this.getContainerHostname(containerInfo);
    const networkAliases = this.getNetworkAliases(containerInfo);
    const capabilities = this.parseCapabilities(config.capabilities);
    const serviceId = this.generateServiceId(config.name, containerId);

    const now = new Date();

    return {
      id: serviceId,
      name: this.sanitizeName(config.name),
      displayName: config.name,
      type: config.type as any,
      category: config.category,
      description: config.description,
      host: hostname,
      port: config.port,
      endpoint: `http://${hostname}:${config.port}`,
      healthCheckPath: config.healthCheckPath || '/health',
      healthStatus: 'unknown' as HealthStatus,
      capabilities,
      requiresIA: config.requiresIA || false,
      iaPolicies: config.iaPolicies ? config.iaPolicies.split(',') : undefined,
      metadata: {
        source: 'docker',
        discoveredAt: now,
        lastUpdated: now,
        labels,
        dockerContainerId: containerId,
        dockerImage: containerInfo.Config?.Image,
        networkAliases,
      },
      enabled: true,
      version: config.version,
    };
  }

  private extractConfig(labels: Record<string, string>): DockerLabelConfig {
    return {
      enabled: labels[LABELS.ENABLED] === 'true',
      name: labels[LABELS.NAME] || '',
      type: labels[LABELS.TYPE] || 'docker',
      category: (labels[LABELS.CATEGORY] as ServiceCategory) || 'core',
      port: parseInt(labels[LABELS.PORT] || '0', 10),
      capabilities: labels[LABELS.CAPABILITIES],
      requiresIA: labels[LABELS.REQUIRES_IA] === 'true',
      iaPolicies: labels[LABELS.IA_POLICIES],
      healthCheckPath: labels[LABELS.HEALTH_PATH],
      description: labels[LABELS.DESCRIPTION],
      version: labels[LABELS.VERSION],
    };
  }

  private parseCapabilities(capabilitiesJson?: string): ServiceCapability[] {
    if (!capabilitiesJson) return [];

    try {
      const parsed = JSON.parse(capabilitiesJson);
      if (Array.isArray(parsed)) {
        return parsed.map(cap => ({
          name: cap.name || cap,
          version: cap.version || '1.0.0',
          endpoints: cap.endpoints || [`/${cap.name || cap}`],
          description: cap.description,
        }));
      }
    } catch {
      return capabilitiesJson.split(',').map(cap => ({
        name: cap.trim(),
        version: '1.0.0',
        endpoints: [`/${cap.trim()}`],
      }));
    }

    return [];
  }

  private getContainerHostname(containerInfo: any): string {
    const containerName = containerInfo.Name?.replace(/^\//, '');
    if (containerName) {
      return containerName;
    }

    const networkSettings = containerInfo.NetworkSettings;
    if (networkSettings?.Networks) {
      const network = networkSettings.Networks[this.options.networkName!];
      if (network?.Aliases?.length > 0) {
        return network.Aliases[0];
      }
    }

    return containerInfo.Id?.substring(0, 12) || 'unknown';
  }

  private getNetworkAliases(containerInfo: any): string[] {
    const aliases: string[] = [];
    const networkSettings = containerInfo.NetworkSettings;

    if (networkSettings?.Networks) {
      for (const networkName of Object.keys(networkSettings.Networks)) {
        const network = networkSettings.Networks[networkName];
        if (network.Aliases) {
          aliases.push(...network.Aliases);
        }
      }
    }

    return [...new Set(aliases)];
  }

  private generateServiceId(name: string, containerId: string): string {
    const sanitized = this.sanitizeName(name);
    const shortId = containerId.substring(0, 8);
    return `docker-${sanitized}-${shortId}`;
  }

  private sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
