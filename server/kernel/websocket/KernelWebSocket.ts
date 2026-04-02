/**
 * KernelWebSocket - WebSocket para atualizações em tempo real
 * Transmite logs, status e eventos do kernel
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { EventEmitter } from 'events';
import { ProcessManager } from '../core/ProcessManager';
import { HealthMonitor } from '../core/HealthMonitor';
import { LogAggregator } from '../core/LogAggregator';
import { LogEntry, ServiceState, KernelEvent, HealthStatus } from '../types';

interface ClientConnection {
  ws: WebSocket;
  id: string;
  subscribedServices: Set<string>;
  subscribedEvents: Set<string>;
  isAlive: boolean;
}

export interface KernelWebSocketOptions {
  path?: string;
  heartbeatInterval?: number;
}

export class KernelWebSocket extends EventEmitter {
  private wss?: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();
  private options: Required<KernelWebSocketOptions>;
  private heartbeatTimer?: NodeJS.Timeout;

  constructor(
    private processManager: ProcessManager,
    private healthMonitor: HealthMonitor,
    private logAggregator: LogAggregator,
    options: KernelWebSocketOptions = {}
  ) {
    super();
    this.options = {
      path: '/ws/kernel',
      heartbeatInterval: 30000,
      ...options,
    };
  }

  /**
   * Inicia o WebSocket server
   */
  attach(server: Server): void {
    this.wss = new WebSocketServer({
      server,
      path: this.options.path,
    });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    // Inicia heartbeat
    this.startHeartbeat();

    // Subscribe aos eventos do kernel
    this.subscribeToKernelEvents();

    console.log(`[Kernel] WebSocket ativo em ${this.options.path}`);
  }

  /**
   * Para o WebSocket server
   */
  stop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    // Fecha todas as conexões
    for (const client of this.clients.values()) {
      client.ws.close();
    }
    this.clients.clear();

    this.wss?.close();
  }

  /**
   * Broadcast para todos os clientes
   */
  broadcast(event: string, data: any): void {
    const message = JSON.stringify({
      type: event,
      data,
      timestamp: new Date(),
    });

    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  }

  /**
   * Broadcast para clientes inscritos em um serviço
   */
  broadcastToService(serviceId: string, event: string, data: any): void {
    const message = JSON.stringify({
      type: event,
      serviceId,
      data,
      timestamp: new Date(),
    });

    for (const client of this.clients.values()) {
      if (
        client.ws.readyState === WebSocket.OPEN &&
        (client.subscribedServices.has(serviceId) || client.subscribedServices.has('*'))
      ) {
        client.ws.send(message);
      }
    }
  }

  /**
   * Retorna número de clientes conectados
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Handler de nova conexão
   */
  private handleConnection(ws: WebSocket, req: any): void {
    const clientId = this.generateClientId();
    const client: ClientConnection = {
      ws,
      id: clientId,
      subscribedServices: new Set(),
      subscribedEvents: new Set(),
      isAlive: true,
    };

    this.clients.set(clientId, client);
    console.log(`[Kernel] Cliente WebSocket conectado: ${clientId}`);

    // Envia estado inicial
    this.sendInitialState(client);

    // Handlers de mensagens
    ws.on('message', (data) => {
      this.handleMessage(client, data.toString());
    });

    // Heartbeat
    ws.on('pong', () => {
      client.isAlive = true;
    });

    // Cleanup na desconexão
    ws.on('close', () => {
      this.clients.delete(clientId);
      console.log(`[Kernel] Cliente WebSocket desconectado: ${clientId}`);
    });

    // Erro
    ws.on('error', (error) => {
      console.error(`[Kernel] Erro WebSocket ${clientId}:`, error);
    });
  }

  /**
   * Handler de mensagens do cliente
   */
  private handleMessage(client: ClientConnection, message: string): void {
    try {
      const data = JSON.parse(message);
      const { action, payload } = data;

      switch (action) {
        case 'subscribe':
          // Inscreve em serviços específicos ou '*' para todos
          if (payload.services) {
            for (const serviceId of payload.services) {
              client.subscribedServices.add(serviceId);
            }
          }
          if (payload.events) {
            for (const event of payload.events) {
              client.subscribedEvents.add(event);
            }
          }
          this.send(client, 'subscribed', { 
            services: Array.from(client.subscribedServices),
            events: Array.from(client.subscribedEvents),
          });
          break;

        case 'unsubscribe':
          if (payload.services) {
            for (const serviceId of payload.services) {
              client.subscribedServices.delete(serviceId);
            }
          }
          if (payload.events) {
            for (const event of payload.events) {
              client.subscribedEvents.delete(event);
            }
          }
          break;

        case 'getLogs':
          // Retorna logs de um serviço
          const logs = this.logAggregator.getServiceLogs(
            payload.serviceId,
            payload.lines || 50
          );
          this.send(client, 'logs', {
            serviceId: payload.serviceId,
            logs,
          });
          break;

        case 'ping':
          this.send(client, 'pong', { timestamp: new Date() });
          break;

        default:
          this.send(client, 'error', { message: `Ação desconhecida: ${action}` });
      }
    } catch (error) {
      this.send(client, 'error', { 
        message: error instanceof Error ? error.message : 'Erro ao processar mensagem' 
      });
    }
  }

  /**
   * Envia mensagem para um cliente
   */
  private send(client: ClientConnection, type: string, data: any): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type,
        data,
        timestamp: new Date(),
      }));
    }
  }

  /**
   * Envia estado inicial para novo cliente
   */
  private sendInitialState(client: ClientConnection): void {
    const states = this.processManager.getAllStates();
    const allHealth = this.healthMonitor.getAllHealth();

    this.send(client, 'initial', {
      services: states.map(s => ({
        id: s.config.id,
        name: s.config.name,
        status: s.status,
        health: allHealth.get(s.config.id) || 'unknown',
        pid: s.pid,
        startTime: s.startTime,
      })),
      timestamp: new Date(),
    });
  }

  /**
   * Inscreve nos eventos do kernel
   */
  private subscribeToKernelEvents(): void {
    // Eventos de serviço
    this.processManager.on('service:started', ({ serviceId, state }) => {
      this.broadcastToService(serviceId, 'service:started', {
        serviceId,
        state: {
          id: state.config.id,
          name: state.config.name,
          status: state.status,
          pid: state.pid,
          startTime: state.startTime,
        },
      });
    });

    this.processManager.on('service:stopped', ({ serviceId, code, signal }) => {
      this.broadcastToService(serviceId, 'service:stopped', {
        serviceId,
        code,
        signal,
      });
    });

    this.processManager.on('service:state_changed', ({ serviceId, state }) => {
      this.broadcastToService(serviceId, 'service:state_changed', {
        serviceId,
        status: state.status,
        restartCount: state.restartCount,
      });
    });

    // Eventos de health
    this.healthMonitor.on('health:changed', ({ serviceId, status, oldStatus }) => {
      this.broadcastToService(serviceId, 'service:health_changed', {
        serviceId,
        health: status,
        previousHealth: oldStatus,
      });
    });

    // Eventos de log
    this.logAggregator.on('log', (entry: LogEntry) => {
      this.broadcastToService(entry.serviceId, 'log:new', entry);
    });
  }

  /**
   * Inicia heartbeat para detectar conexões mortas
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      for (const client of this.clients.values()) {
        if (!client.isAlive) {
          client.ws.terminate();
          this.clients.delete(client.id);
          continue;
        }
        
        client.isAlive = false;
        client.ws.ping();
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Gera ID único para cliente
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
