/**
 * XOS Discovery Provider
 * Descobre serviços e integrações do XOS (Experience Operating System)
 * 
 * O XOS é o sistema operacional de experiência do cliente, unificando:
 * - CRM (Pipeline, Contatos, Empresas)
 * - Atendimento (Inbox, Tickets, Filas)
 * - Marketing (Campanhas, Automações)
 * - Integrações (WhatsApp, Email, SMS)
 * 
 * Este provider consulta o banco de dados para descobrir:
 * 1. Filas de atendimento ativas
 * 2. Integrações de comunicação configuradas
 * 3. Automações ativas
 * 4. Canais de entrada (WhatsApp, Email, Chat)
 */

import { DiscoveryProvider, RegisteredService, ServiceCategory, ServiceCapability } from '../registry/types';
import { HealthStatus } from '../types';
import { db } from '../../../db';
import { sql } from 'drizzle-orm';

export interface XOSDiscoveryOptions {
  // Opções futuras: filtros por tenant, etc
}

// Tipos de serviços XOS que podem ser descobertos
interface XOSQueue {
  id: number;
  name: string;
  is_active: boolean;
  users_count?: number;
  open_conversations?: number;
}

interface XOSIntegration {
  id: number;
  type: string; // 'whatsapp', 'email', 'sms', 'chat'
  name: string;
  status: string;
  config?: any;
}

interface XOSAutomation {
  id: number;
  name: string;
  trigger_type: string;
  is_active: boolean;
}

export class XOSDiscovery implements DiscoveryProvider {
  public readonly name = 'XOSDiscovery';
  private options: XOSDiscoveryOptions;

  constructor(options: XOSDiscoveryOptions = {}) {
    this.options = options;
  }

  /**
   * Verifica se o XOS está disponível (se as tabelas existem)
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Verifica se a tabela xos_queues existe
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'xos_queues'
        ) as exists
      `);
      return result.rows[0]?.exists === true;
    } catch {
      // Se der erro, assume que não está disponível
      return false;
    }
  }

  /**
   * Descobre todos os serviços XOS
   */
  async discover(): Promise<RegisteredService[]> {
    const services: RegisteredService[] = [];

    try {
      // 1. Descobrir filas de atendimento ativas
      const queues = await this.discoverQueues();
      services.push(...queues);

      // 2. Descobrir integrações de comunicação
      const integrations = await this.discoverIntegrations();
      services.push(...integrations);

      // 3. Descobrir automações ativas
      const automations = await this.discoverAutomations();
      services.push(...automations);

      console.log(`[XOSDiscovery] Descobertos ${services.length} serviços XOS`);
      return services;
    } catch (error) {
      console.error('[XOSDiscovery] Erro ao descobrir serviços:', error);
      return [];
    }
  }

  /**
   * Descobre filas de atendimento
   */
  private async discoverQueues(): Promise<RegisteredService[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          q.id, 
          q.name, 
          q.is_active,
          (SELECT COUNT(*) FROM xos_queue_users qu WHERE qu.queue_id = q.id AND qu.is_active = true) as users_count,
          (SELECT COUNT(*) FROM xos_conversations c WHERE c.queue_id = q.id AND c.status = 'open') as open_conversations
        FROM xos_queues q
        WHERE q.is_active = true
      `);

      const queues = result.rows as XOSQueue[];
      
      return queues.map((queue): RegisteredService => ({
        id: `xos-queue-${queue.id}`,
        name: `Fila: ${queue.name}`,
        displayName: queue.name,
        type: 'node',
        category: 'intelligence',
        description: `Fila de atendimento XOS - ${queue.open_conversations || 0} conversas abertas, ${queue.users_count || 0} atendentes`,
        host: 'localhost',
        port: 5000, // Porta principal da aplicação
        endpoint: 'http://localhost:5000',
        healthCheckPath: '/api/xos/health',
        healthStatus: queue.is_active ? 'healthy' : 'unhealthy',
        lastHealthCheck: new Date(),
        capabilities: [
          { name: 'queue_management', version: '1.0', endpoints: ['/api/xos/queues'] },
          { name: 'conversation_routing', version: '1.0', endpoints: ['/api/xos/conversations'] },
          { name: 'sla_monitoring', version: '1.0', endpoints: ['/api/xos/sla'] },
        ],
        requiresIA: false,
        metadata: {
          source: 'manual', // XOS é configurado manualmente no banco
          discoveredAt: new Date(),
          lastUpdated: new Date(),
          labels: {
            'xos.type': 'queue',
            'xos.queue_id': String(queue.id),
            'xos.open_conversations': String(queue.open_conversations || 0),
            'xos.active_users': String(queue.users_count || 0),
          },
        },
        enabled: queue.is_active,
        version: '1.0.0',
      }));
    } catch (error) {
      console.error('[XOSDiscovery] Erro ao descobrir filas:', error);
      return [];
    }
  }

  /**
   * Descobre integrações de comunicação
   */
  private async discoverIntegrations(): Promise<RegisteredService[]> {
    const services: RegisteredService[] = [];

    try {
      // WhatsApp Business (Miroflow)
      const whatsappResult = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM whatsapp_sessions 
        WHERE status = 'connected'
      `);
      const whatsappCount = parseInt(whatsappResult.rows[0]?.count || '0', 10);

      if (whatsappCount > 0) {
        services.push({
          id: 'xos-whatsapp',
          name: 'WhatsApp Business',
          displayName: 'WhatsApp Business (Miroflow)',
          type: 'node',
          category: 'communication',
          description: `Integração WhatsApp Business - ${whatsappCount} sessão(ões) conectada(s)`,
          host: process.env.MIROFLOW_HOST || 'miroflow',
          port: parseInt(process.env.MIROFLOW_PORT || '8006', 10),
          endpoint: `http://${process.env.MIROFLOW_HOST || 'miroflow'}:${process.env.MIROFLOW_PORT || '8006'}`,
          healthCheckPath: '/health',
          healthStatus: 'unknown', // Será verificado pelo health check
          lastHealthCheck: new Date(),
          capabilities: [
            { name: 'whatsapp_messaging', version: '1.0', endpoints: ['/api/whatsapp/send'] },
            { name: 'whatsapp_webhook', version: '1.0', endpoints: ['/api/whatsapp/webhook'] },
            { name: 'template_messages', version: '1.0', endpoints: ['/api/whatsapp/templates'] },
          ],
          requiresIA: true,
          iaPolicies: ['communication', 'lgpd'],
          metadata: {
            source: 'manual',
            discoveredAt: new Date(),
            lastUpdated: new Date(),
            labels: {
              'xos.type': 'integration',
              'xos.integration_type': 'whatsapp',
              'xos.sessions_count': String(whatsappCount),
            },
          },
          enabled: true,
          version: '1.0.0',
        });
      }

      // Email (se houver configuração)
      const emailResult = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM settings 
        WHERE key LIKE 'smtp_%' OR key LIKE 'email_%'
      `);
      const hasEmail = parseInt(emailResult.rows[0]?.count || '0', 10) > 0;

      if (hasEmail) {
        services.push({
          id: 'xos-email',
          name: 'Email Service',
          displayName: 'Serviço de Email',
          type: 'node',
          category: 'communication',
          description: 'Integração SMTP para envio de emails',
          host: 'localhost',
          port: 5000,
          endpoint: 'http://localhost:5000',
          healthCheckPath: '/api/health',
          healthStatus: 'unknown',
          lastHealthCheck: new Date(),
          capabilities: [
            { name: 'email_sending', version: '1.0', endpoints: ['/api/email/send'] },
            { name: 'email_templates', version: '1.0', endpoints: ['/api/email/templates'] },
          ],
          requiresIA: false,
          metadata: {
            source: 'manual',
            discoveredAt: new Date(),
            lastUpdated: new Date(),
            labels: {
              'xos.type': 'integration',
              'xos.integration_type': 'email',
            },
          },
          enabled: true,
          version: '1.0.0',
        });
      }

      return services;
    } catch (error) {
      console.error('[XOSDiscovery] Erro ao descobrir integrações:', error);
      return [];
    }
  }

  /**
   * Descobre automações ativas
   */
  private async discoverAutomations(): Promise<RegisteredService[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          id, 
          name, 
          trigger_type,
          is_active
        FROM xos_automations
        WHERE is_active = true
        LIMIT 10
      `);

      const automations = result.rows as XOSAutomation[];

      if (automations.length === 0) {
        return [];
      }

      // Cria um serviço único para o motor de automações XOS
      return [{
        id: 'xos-automations',
        name: 'XOS Automation Engine',
        displayName: 'Motor de Automações XOS',
        type: 'node',
        category: 'automation',
        description: `Motor de automações XOS - ${automations.length} automação(ões) ativa(s)`,
        host: 'localhost',
        port: 5000,
        endpoint: 'http://localhost:5000',
        healthCheckPath: '/api/xos/automations/health',
        healthStatus: 'healthy',
        lastHealthCheck: new Date(),
        capabilities: [
          { name: 'workflow_automation', version: '1.0', endpoints: ['/api/xos/automations'] },
          { name: 'trigger_management', version: '1.0', endpoints: ['/api/xos/automations/triggers'] },
          { name: 'action_execution', version: '1.0', endpoints: ['/api/xos/automations/execute'] },
        ],
        requiresIA: true,
        iaPolicies: ['automation', 'lgpd'],
        metadata: {
          source: 'manual',
          discoveredAt: new Date(),
          lastUpdated: new Date(),
          labels: {
            'xos.type': 'automation_engine',
            'xos.automations_count': String(automations.length),
            'xos.triggers': automations.map(a => a.trigger_type).join(','),
          },
        },
        enabled: true,
        version: '1.0.0',
      }];
    } catch (error) {
      console.error('[XOSDiscovery] Erro ao descobrir automações:', error);
      return [];
    }
  }
}
