/**
 * Engine Room Routes - Casa de Máquinas (Simplificado)
 * 
 * APENAS consulta o Registry do Kernel.
 * Não gerencia mais presets - mostra apenas serviços descobertos.
 */

import type { Express, Request, Response } from "express";
import http from "http";

// Consulta Registry do Kernel para serviços descobertos
// Usa http.get em vez de fetch por causa de problemas com loopback no Node.js
// Implementa retry com backoff para maior resiliência
async function fetchRegistryServicesWithRetry(maxRetries = 3, delay = 500): Promise<any[] | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await fetchRegistryServicesOnce();
    if (result !== null) {
      return result;
    }
    if (attempt < maxRetries) {
      console.log(`[Engine Room] Tentativa ${attempt} falhou, aguardando ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      delay *= 2; // Exponential backoff
    }
  }
  return null;
}

async function fetchRegistryServicesOnce(): Promise<any[] | null> {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: '/api/registry/services',
      method: 'GET',
      timeout: 3000,
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const services = json.success && Array.isArray(json.data?.services) ? json.data.services : null;
          console.log(`[Engine Room] Registry retornou ${services?.length || 0} serviços`);
          resolve(services);
        } catch (e) {
          console.error('[Engine Room] Erro ao parsear resposta:', e);
          resolve(null);
        }
      });
    });

    req.on('error', (error) => {
      console.error('[Engine Room] Erro ao consultar Registry:', error.message);
      resolve(null);
    });

    req.on('timeout', () => {
      console.error('[Engine Room] Timeout ao consultar Registry');
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}

// Converte serviço do Registry para formato EngineStatus
function mapRegistryToEngine(service: any): any {
  const id = service.id || service.name;
  
  let status: 'online' | 'offline' | 'error' = 'offline';
  if (service.healthStatus === 'healthy') status = 'online';
  else if (service.healthStatus === 'unhealthy') status = 'error';
  
  return {
    name: id,
    displayName: service.displayName || service.name,
    type: service.type || 'unknown',
    port: service.port || 0,
    category: service.category || 'data',
    description: service.description || `Serviço ${service.name}`,
    status,
    responseTime: undefined,
    details: {
      endpoint: service.endpoint,
      health: service.healthStatus,
      version: service.version,
      capabilities: service.capabilities?.map((c: any) => c.name) || [],
      source: 'registry',
    },
  };
}

export function registerEngineRoomRoutes(app: Express): void {
  // Status da Casa de Máquinas - APENAS do Registry
  app.get("/api/engine-room/status", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const registryServices = await fetchRegistryServicesWithRetry();
      const engines: any[] = [];
      
      if (registryServices && registryServices.length > 0) {
        for (const service of registryServices) {
          engines.push(mapRegistryToEngine(service));
        }
      }

      let agentsStatus: any[] = [];
      try {
        const { getAgentsStatus } = await import("../blackboard/agents");
        agentsStatus = getAgentsStatus();
      } catch {
        agentsStatus = [];
      }

      const online = engines.filter((r) => r.status === "online").length;
      const total = engines.length;

      res.json({
        engines,
        agents: agentsStatus,
        summary: {
          total_engines: total,
          online_engines: online,
          offline_engines: total - online,
          health_pct: total > 0 ? Math.round((online / total) * 100) : 0,
          total_agents: agentsStatus.length,
          running_agents: agentsStatus.filter((a: any) => a.running).length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("[Engine Room] Status error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Lista de engines - APENAS do Registry
  app.get("/api/engine-room/engines", async (_req: Request, res: Response) => {
    const registryServices = await fetchRegistryServicesWithRetry();
    const engines = registryServices?.map(mapRegistryToEngine) || [];
    
    res.json({
      engines: engines.map((e) => ({
        name: e.name,
        displayName: e.displayName,
        type: e.type,
        port: e.port,
        category: e.category,
        description: e.description,
      })),
    });
  });

  // Agents
  app.get("/api/engine-room/agents", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      let agentsStatus: any[] = [];
      try {
        const { getAgentsStatus } = await import("../blackboard/agents");
        agentsStatus = getAgentsStatus();
      } catch {
        agentsStatus = [];
      }

      res.json({ agents: agentsStatus });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/engine-room/agents/start", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      try {
        const { startAllAgents } = await import("../blackboard/agents");
        startAllAgents();
        res.json({ success: true, message: "Agentes iniciados" });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/engine-room/agents/stop", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      try {
        const { stopAllAgents } = await import("../blackboard/agents");
        stopAllAgents();
        res.json({ success: true, message: "Agentes parados" });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AÇÕES DESABILITADAS - Não gerenciamos mais presets
  // Os serviços são gerenciados pelo Docker/Coolify
  
  app.post("/api/engine-room/engine/:name/restart", async (req: Request, res: Response) => {
    res.status(501).json({ 
      error: "Não implementado", 
      message: "Serviços são gerenciados pelo Docker/Coolify. Use o painel do Coolify." 
    });
  });

  app.post("/api/engine-room/engine/:name/stop", async (req: Request, res: Response) => {
    res.status(501).json({ 
      error: "Não implementado", 
      message: "Serviços são gerenciados pelo Docker/Coolify. Use o painel do Coolify." 
    });
  });

  app.post("/api/engine-room/engine/:name/start", async (req: Request, res: Response) => {
    res.status(501).json({ 
      error: "Não implementado", 
      message: "Serviços são gerenciados pelo Docker/Coolify. Use o painel do Coolify." 
    });
  });

  app.get("/api/engine-room/engine/:name/info", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const registryServices = await fetchRegistryServicesWithRetry();
      const service = registryServices?.find((s: any) => s.id === req.params.name || s.name === req.params.name);
      
      if (!service) {
        return res.status(404).json({ error: "Servico nao encontrado no registry" });
      }

      res.json(mapRegistryToEngine(service));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/engine-room/engine/:name/logs", async (req: Request, res: Response) => {
    res.status(501).json({ 
      error: "Não implementado", 
      message: "Logs disponiveis via Docker: docker logs <container_name>" 
    });
  });

  console.log("[Engine Room] Rotas registradas (modo simplificado - apenas Registry)");
}
