/**
 * API Routes - Rotas REST do Kernel
 * Endpoints para controle e monitoramento dos serviços
 */

import { Router, Request, Response } from 'express';
import { ProcessManager } from '../core/ProcessManager';
import { HealthMonitor } from '../core/HealthMonitor';
import { LogAggregator } from '../core/LogAggregator';
import { ApiResponse, ServiceActionRequest, ServiceLogsRequest } from '../types';

export function createKernelRoutes(
  processManager: ProcessManager,
  healthMonitor: HealthMonitor,
  logAggregator: LogAggregator
): Router {
  const router = Router();

  // Middleware para JSON
  router.use(expressJson());

  // ==========================================
  // SERVICES ENDPOINTS
  // ==========================================

  /**
   * GET /api/kernel/services
   * Lista todos os serviços com seu estado atual
   */
  router.get('/services', (req: Request, res: Response) => {
    const states = processManager.getAllStates();
    
    // Adiciona health status de cada serviço
    const servicesWithHealth = states.map(state => ({
      ...state,
      health: healthMonitor.getHealth(state.config.id),
    }));

    res.json(successResponse(servicesWithHealth));
  });

  /**
   * GET /api/kernel/services/:id
   * Detalhes de um serviço específico
   */
  router.get('/services/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const state = processManager.getServiceState(id);

    if (!state) {
      return res.status(404).json(errorResponse(`Serviço ${id} não encontrado`));
    }

    res.json(successResponse({
      ...state,
      health: healthMonitor.getHealth(id),
    }));
  });

  /**
   * POST /api/kernel/services/:id/start
   * Inicia um serviço
   */
  router.post('/services/:id/start', async (req: Request, res: Response) => {
    const { id } = req.params;
    
    try {
      const state = await processManager.startService(id);
      healthMonitor.startMonitoring(id, state);
      res.json(successResponse(state));
    } catch (error) {
      res.status(500).json(errorResponse(
        error instanceof Error ? error.message : 'Erro ao iniciar serviço'
      ));
    }
  });

  /**
   * POST /api/kernel/services/:id/stop
   * Para um serviço
   */
  router.post('/services/:id/stop', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { force } = req.body as ServiceActionRequest;
    
    try {
      const state = await processManager.stopService(id, force);
      healthMonitor.stopMonitoring(id);
      res.json(successResponse(state));
    } catch (error) {
      res.status(500).json(errorResponse(
        error instanceof Error ? error.message : 'Erro ao parar serviço'
      ));
    }
  });

  /**
   * POST /api/kernel/services/:id/restart
   * Reinicia um serviço
   */
  router.post('/services/:id/restart', async (req: Request, res: Response) => {
    const { id } = req.params;
    
    try {
      const state = await processManager.restartService(id);
      healthMonitor.startMonitoring(id, state);
      res.json(successResponse(state));
    } catch (error) {
      res.status(500).json(errorResponse(
        error instanceof Error ? error.message : 'Erro ao reiniciar serviço'
      ));
    }
  });

  /**
   * POST /api/kernel/services/:id/kill
   * Mata um serviço (force)
   */
  router.post('/services/:id/kill', async (req: Request, res: Response) => {
    const { id } = req.params;
    
    try {
      const state = await processManager.killService(id);
      healthMonitor.stopMonitoring(id);
      res.json(successResponse(state));
    } catch (error) {
      res.status(500).json(errorResponse(
        error instanceof Error ? error.message : 'Erro ao matar serviço'
      ));
    }
  });

  // ==========================================
  // LOGS ENDPOINTS
  // ==========================================

  /**
   * GET /api/kernel/services/:id/logs
   * Logs de um serviço específico
   */
  router.get('/services/:id/logs', (req: Request, res: Response) => {
    const { id } = req.params;
    const { lines = '100', level } = req.query;

    const logs = logAggregator.getServiceLogs(
      id,
      parseInt(lines as string, 10) || 100
    );

    // Filtra por nível se especificado
    let filteredLogs = logs;
    if (level) {
      const levels = ['debug', 'info', 'warn', 'error'];
      const minLevel = levels.indexOf(level as string);
      filteredLogs = logs.filter(l => levels.indexOf(l.level) >= minLevel);
    }

    res.json(successResponse(filteredLogs));
  });

  /**
   * GET /api/kernel/logs
   * Logs de todos os serviços
   */
  router.get('/logs', (req: Request, res: Response) => {
    const { lines = '100', service, level } = req.query;

    const logs = logAggregator.getAll({
      lines: parseInt(lines as string, 10) || 100,
      serviceId: service as string | undefined,
      level: level as any,
    });

    res.json(successResponse(logs));
  });

  /**
   * DELETE /api/kernel/logs
   * Limpa logs
   */
  router.delete('/logs', (req: Request, res: Response) => {
    const { service } = req.query;

    if (service) {
      logAggregator.clearService(service as string);
    } else {
      logAggregator.clearAll();
    }

    res.json(successResponse({ cleared: true }));
  });

  // ==========================================
  // HEALTH ENDPOINTS
  // ==========================================

  /**
   * GET /api/kernel/health
   * Health check geral do kernel
   */
  router.get('/health', (req: Request, res: Response) => {
    const states = processManager.getAllStates();
    const allHealth = healthMonitor.getAllHealth();

    const healthy = Array.from(allHealth.values()).filter(h => h === 'healthy').length;
    const unhealthy = Array.from(allHealth.values()).filter(h => h === 'unhealthy').length;
    const running = states.filter(s => s.status === 'running').length;
    const total = states.length;

    const health = {
      status: unhealthy === 0 ? 'healthy' : 'unhealthy',
      summary: {
        total,
        running,
        healthy,
        unhealthy,
        unknown: total - healthy - unhealthy,
      },
      services: states.map(s => ({
        id: s.config.id,
        name: s.config.name,
        status: s.status,
        health: allHealth.get(s.config.id) || 'unknown',
        pid: s.pid,
        uptime: s.startTime 
          ? Date.now() - s.startTime.getTime() 
          : 0,
      })),
    };

    res.json(successResponse(health));
  });

  /**
   * GET /api/kernel/services/:id/health
   * Health check de um serviço específico
   */
  router.get('/services/:id/health', async (req: Request, res: Response) => {
    const { id } = req.params;
    
    // Força um check imediato
    const health = await healthMonitor.forceCheck(id);
    
    res.json(successResponse({
      serviceId: id,
      health,
      timestamp: new Date(),
    }));
  });

  // ==========================================
  // ACTIONS ENDPOINTS
  // ==========================================

  /**
   * POST /api/kernel/actions/start-all
   * Inicia todos os serviços
   */
  router.post('/actions/start-all', async (req: Request, res: Response) => {
    const { auto = true } = req.body;
    
    res.json(successResponse({
      message: 'Iniciando serviços...',
      auto,
    }));

    // Executa em background
    processManager.startAll(auto).catch(() => {});
  });

  /**
   * POST /api/kernel/actions/stop-all
   * Para todos os serviços
   */
  router.post('/actions/stop-all', async (req: Request, res: Response) => {
    const { force = false } = req.body;
    
    await processManager.stopAll(force);
    healthMonitor.stopAll();
    
    res.json(successResponse({
      message: 'Todos os serviços parados',
      force,
    }));
  });

  /**
   * POST /api/kernel/actions/restart-all
   * Reinicia todos os serviços
   */
  router.post('/actions/restart-all', async (req: Request, res: Response) => {
    const states = processManager.getAllStates();
    
    res.json(successResponse({
      message: 'Reiniciando serviços...',
      count: states.filter(s => s.status === 'running').length,
    }));

    // Executa em background
    for (const state of states) {
      if (state.status === 'running') {
        try {
          await processManager.restartService(state.config.id);
        } catch (error) {
          // Ignora erros individuais
        }
      }
    }
  });

  // ==========================================
  // STATS ENDPOINTS
  // ==========================================

  /**
   * GET /api/kernel/stats
   * Estatísticas do kernel
   */
  router.get('/stats', (req: Request, res: Response) => {
    const states = processManager.getAllStates();
    const logStats = logAggregator.getStats();

    const stats = {
      services: {
        total: states.length,
        running: states.filter(s => s.status === 'running').length,
        stopped: states.filter(s => s.status === 'stopped').length,
        error: states.filter(s => s.status === 'error').length,
        restarting: states.filter(s => s.status === 'restarting').length,
      },
      health: {
        healthy: Array.from(healthMonitor.getAllHealth().values())
          .filter(h => h === 'healthy').length,
        unhealthy: Array.from(healthMonitor.getAllHealth().values())
          .filter(h => h === 'unhealthy').length,
        unknown: Array.from(healthMonitor.getAllHealth().values())
          .filter(h => h === 'unknown').length,
      },
      logs: logStats,
      totalRestarts: states.reduce((sum, s) => sum + s.restartCount, 0),
    };

    res.json(successResponse(stats));
  });

  // ==========================================
  // MISC ENDPOINTS
  // ==========================================

  /**
   * GET /api/kernel/config
   * Configuração do kernel
   */
  router.get('/config', (req: Request, res: Response) => {
    const states = processManager.getAllStates();
    
    res.json(successResponse({
      services: states.map(s => ({
        id: s.config.id,
        name: s.config.name,
        type: s.config.type,
        port: s.config.port,
        autoStart: s.config.autoStart,
        maxRestarts: s.config.maxRestarts,
      })),
    }));
  });

  return router;
}

// Helper para JSON middleware (evita import do express inteiro)
function expressJson() {
  return (req: Request, res: Response, next: any) => {
    if (req.headers['content-type']?.includes('application/json')) {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => {
        try {
          (req as any).body = data ? JSON.parse(data) : {};
        } catch {
          (req as any).body = {};
        }
        next();
      });
    } else {
      (req as any).body = {};
      next();
    }
  };
}

// Helpers de resposta
function successResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date(),
  };
}

function errorResponse(error: string): ApiResponse {
  return {
    success: false,
    error,
    timestamp: new Date(),
  };
}
