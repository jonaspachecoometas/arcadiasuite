/**
 * Coolify Discovery Provider
 * Descobre serviços via API do Coolify
 */

import { DiscoveryProvider, RegisteredService, ServiceCategory } from '../registry/types';
import { HealthStatus } from '../types';

export interface CoolifyDiscoveryOptions {
  baseUrl: string;
  token: string;
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
      const response = await fetch(`${this.options.baseUrl}/api/v1/health`, {
        headers: { 'Authorization': `Bearer ${this.options.token}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async discover(): Promise<RegisteredService[]> {
    // Implementação inicial - retorna array vazio
    // Depois vamos integrar com a API real do Coolify
    return [];
  }
}
