/**
 * Engine Room Routes - Casa de Máquinas (Simplificado)
 * 
 * APENAS consulta o Registry do Kernel.
 * Não gerencia mais presets - mostra apenas serviços descobertos.
 */

import type { Express, Request, Response } from "express";

// Consulta Registry do Kernel para serviços descobertos
async function fetchRegistryServices(): Promise<any[] | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('http://localhost:5001/api/registry/services', {
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.success && Array.isArray(data.data?.services) ? data.data.services : null;
  } catch {
    return null;
  }
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

      const registryServices = await fetchRegistryServices();
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
    const registryServices = await fetchRegistryServices();
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

      const registryServices = await fetchRegistryServices();
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
