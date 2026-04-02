/**
 * Tipos e Interfaces do Arcadia Kernel
 * Sistema de gerenciamento nativo de serviços
 */

export type ServiceType = 'python' | 'node';
export type ServiceStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error' | 'restarting';
export type HealthStatus = 'healthy' | 'unhealthy' | 'unknown' | 'checking';

export interface HealthCheckConfig {
  path: string;
  interval: number; // ms
  timeout?: number; // ms
  retries?: number;
}

export interface ServiceConfig {
  id: string;
  name: string;
  type: ServiceType;
  command: string;
  args: string[];
  cwd?: string;
  port: number;
  env?: Record<string, string>;
  healthCheck?: HealthCheckConfig;
  maxRestarts?: number;
  autoStart?: boolean;
  description?: string;
}

export interface ServiceState {
  config: ServiceConfig;
  status: ServiceStatus;
  health: HealthStatus;
  pid?: number;
  startTime?: Date;
  restartCount: number;
  lastError?: string;
  lastLog?: string;
  cpu?: number; // CPU usage %
  memory?: number; // Memory in MB
}

export interface LogEntry {
  timestamp: Date;
  serviceId: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: 'stdout' | 'stderr' | 'system';
}

export interface KernelStats {
  totalServices: number;
  runningServices: number;
  healthyServices: number;
  errorServices: number;
  totalRestarts: number;
  uptime: number; // ms since kernel start
  cpuUsage: number;
  memoryUsage: number;
}

export interface TenantStats {
  tenantId: number;
  name: string;
  activeUsers: number;
  totalRequests: number;
  lastActivity: Date;
}

export interface DashboardData {
  services: ServiceState[];
  stats: KernelStats;
  tenants: TenantStats[];
  recentLogs: LogEntry[];
  timestamp: Date;
}

export interface KernelConfig {
  dashboard: {
    port: number;
    host: string;
    authEnabled: boolean;
  };
  websocket: {
    path: string;
    heartbeatInterval: number;
  };
  healthCheck: {
    defaultInterval: number;
    defaultTimeout: number;
    defaultRetries: number;
  };
  logging: {
    maxLines: number;
    retentionHours: number;
  };
}

// WebSocket event types
export type KernelEventType = 
  | 'service:started'
  | 'service:stopped'
  | 'service:restarted'
  | 'service:error'
  | 'service:health_changed'
  | 'log:new'
  | 'stats:update'
  | 'tenant:activity';

export interface KernelEvent {
  type: KernelEventType;
  timestamp: Date;
  data: any;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface ServiceActionRequest {
  action: 'start' | 'stop' | 'restart' | 'kill';
  force?: boolean;
}

export interface ServiceLogsRequest {
  lines?: number;
  since?: Date;
  level?: 'info' | 'warn' | 'error' | 'debug';
}
