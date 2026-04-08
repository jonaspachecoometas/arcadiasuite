import type { Express, Request, Response } from "express";
import { 
  getKernelEngines, 
  getKernelServiceInfo, 
  getKernelServiceLogs,
  startKernelService,
  stopKernelService, 
  restartKernelService,
  getKernelHealth,
  isKernelAvailable
} from "./kernel-adapter";

// NOVO: Consulta Registry do Kernel para serviços descobertos
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

// NOVO: Converte serviço do Registry para formato EngineStatus
function mapRegistryToEngine(service: any): any {
  const id = service.id || service.name;
  
  // Mapear health status
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

// Fallback para sistema antigo (import comentado - remover após validação)
// import { restartManagedService, stopManagedService, getManagedServiceInfo, getManagedServiceLogs } from "../index";

interface EngineConfig {
  name: string;
  displayName: string;
  type: "python" | "php" | "node" | "java";
  port: number;
  healthPath: string;
  category: "erp" | "intelligence" | "data" | "fiscal" | "automation";
  description: string;
}

const ENGINES: EngineConfig[] = [
  {
    name: "plus",
    displayName: "Arcadia Plus (ERP)",
    type: "php",
    port: 8080,
    healthPath: "/api/health",
    category: "erp",
    description: "ERP completo Laravel - PDV, NF-e, Estoque, Financeiro",
  },
  {
    name: "contabil",
    displayName: "Motor Contabil",
    type: "python",
    port: 8003,
    healthPath: "/health",
    category: "fiscal",
    description: "Contabilidade - Lancamentos, DRE, Balancete, Razao",
  },
  {
    name: "fisco",
    displayName: "Motor Fiscal",
    type: "python",
    port: 8002,
    healthPath: "/health",
    category: "fiscal",
    description: "NF-e/NFC-e - NCMs, CFOPs, CESTs, SEFAZ",
  },
  {
    name: "bi-engine",
    displayName: "Motor BI",
    type: "python",
    port: 8004,
    healthPath: "/health",
    category: "data",
    description: "Business Intelligence - SQL, Charts, Micro-BI, Cache",
  },
  {
    name: "automation-engine",
    displayName: "Motor Automacao",
    type: "python",
    port: 8005,
    healthPath: "/health",
    category: "automation",
    description: "Scheduler, Event Bus, Workflow Executor",
  },
  {
    name: "communication",
    displayName: "Motor Comunicação",
    type: "node",
    port: 8006,
    healthPath: "/health",
    category: "intelligence",
    description: "Inbox Unificada, Contatos, Threads, Canais, Eventos para IA",
  },
  {
    name: "metaset",
    displayName: "MetaSet BI",
    type: "python",
    port: 8100,
    healthPath: "/health",
    category: "data",
    description: "MetaSet BI - Business Intelligence by ArcadiaSuite (Apache Superset fork)",
  },
];

// Helper para obter URL de health check - considera containers externos
function getEngineHealthUrl(engine: EngineConfig): string {
  // MetaSet roda em container separado
  if (engine.name === "metaset") {
    const metasetHost = process.env.METASET_HOST || "metaset";
    return `http://${metasetHost}:${engine.port}${engine.healthPath}`;
  }
  // Plus também roda externamente (quando instalado)
  if (engine.name === "plus") {
    const plusHost = process.env.PLUS_HOST || "localhost";
    return `http://${plusHost}:${engine.port}${engine.healthPath}`;
  }
  // Padrão: localhost (para compatibilidade)
  return `http://localhost:${engine.port}${engine.healthPath}`;
}

async function checkEngineHealth(engine: EngineConfig): Promise<any> {
  const url = getEngineHealthUrl(engine);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const start = Date.now();
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const elapsed = Date.now() - start;

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        ...engine,
        status: "online",
        responseTime: elapsed,
        details: data,
      };
    }
    return {
      ...engine,
      status: "error",
      responseTime: elapsed,
      httpStatus: response.status,
    };
  } catch (err: any) {
    clearTimeout(timeout);
    return {
      ...engine,
      status: "offline",
      error: err.name === "AbortError" ? "timeout" : err.message,
    };
  }
}

export function registerEngineRoomRoutes(app: Express): void {
  app.get("/api/engine-room/status", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Verificar se Kernel está disponível
      const kernelAvailable = await isKernelAvailable();
      if (!kernelAvailable) {
        return res.status(503).json({ 
          error: "Kernel não disponível", 
          message: "O Arcadia Kernel (porta 5001) não está respondendo. Verifique se está rodando com KERNEL_ENABLED=true" 
        });
      }

      // NOVO: Tentar obter serviços do Registry primeiro
      const registryServices = await fetchRegistryServices();
      const engines: any[] = [];
      const engineNames = new Set<string>();
      
      if (registryServices && registryServices.length > 0) {
        // Usar serviços do Registry (descobertos via Docker/Coolify)
        for (const service of registryServices) {
          const mapped = mapRegistryToEngine(service);
          engines.push(mapped);
          engineNames.add(mapped.name);
        }
        console.log(`[Engine Room] ${engines.length} serviços do Registry`);
      } else {
        // Fallback: usar engines do Kernel (modo antigo)
        const kernelEngines = await getKernelEngines();
        engines.push(...kernelEngines);
        kernelEngines.forEach(e => engineNames.add(e.name));
        console.log(`[Engine Room] ${engines.length} serviços do Kernel (fallback)`);
      }
      
      // Adicionar serviços externos que não estão no Registry
      // Plus (gerenciado externamente - PHP/Laravel)
      if (!engineNames.has("plus")) {
        const plusEngine = ENGINES.find(e => e.name === "plus");
        if (plusEngine) {
          const plusHealth = await checkEngineHealth(plusEngine);
          engines.push({
            ...plusHealth,
            name: plusEngine.name,
            displayName: plusEngine.displayName,
            type: plusEngine.type,
            category: plusEngine.category,
            description: plusEngine.description,
          } as any);
          engineNames.add("plus");
        }
      }

      // MetaSet (gerenciado externamente - Python/Superset)
      // Só adiciona se não estiver no Registry e se bi-engine não existir
      // (evita duplicação de Motor BI)
      if (!engineNames.has("metaset") && !engineNames.has("bi-engine")) {
        const metasetEngine = ENGINES.find(e => e.name === "metaset");
        if (metasetEngine) {
          const metasetHealth = await checkEngineHealth(metasetEngine);
          engines.push({
            ...metasetHealth,
            name: metasetEngine.name,
            displayName: metasetEngine.displayName,
            type: metasetEngine.type,
            category: metasetEngine.category,
            description: metasetEngine.description,
          } as any);
          engineNames.add("metaset");
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

  app.get("/api/engine-room/engine/:name/health", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const engine = ENGINES.find((e) => e.name === req.params.name);
      if (!engine) {
        return res.status(404).json({ error: "Motor nao encontrado" });
      }

      const result = await checkEngineHealth(engine);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/engine-room/engines", async (_req: Request, res: Response) => {
    res.json({
      engines: ENGINES.map((e) => ({
        name: e.name,
        displayName: e.displayName,
        type: e.type,
        port: e.port,
        category: e.category,
        description: e.description,
      })),
    });
  });

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


  app.post("/api/engine-room/engine/:name/restart", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const engineName = req.params.name;

      if (engineName === "plus") {
        return res.status(400).json({ error: "Plus (Laravel) nao pode ser reiniciado por aqui" });
      }
      if (engineName === "metaset") {
        return res.status(400).json({ error: "MetaSet (Java) nao pode ser reiniciado por aqui" });
      }

      // Verificar se Kernel está disponível
      const kernelAvailable = await isKernelAvailable();
      if (!kernelAvailable) {
        return res.status(503).json({ error: "Kernel não disponível" });
      }

      const restarted = await restartKernelService(engineName);
      if (restarted) {
        res.json({ success: true, message: `Motor ${engineName} reiniciando...` });
      } else {
        res.status(500).json({ error: `Falha ao reiniciar motor ${engineName}` });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/engine-room/engine/:name/stop", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const engineName = req.params.name;

      if (engineName === "plus") {
        return res.status(400).json({ error: "Plus (Laravel) nao pode ser parado por aqui" });
      }
      if (engineName === "metaset") {
        return res.status(400).json({ error: "MetaSet (Java) nao pode ser parado por aqui" });
      }

      // Verificar se Kernel está disponível
      const kernelAvailable = await isKernelAvailable();
      if (!kernelAvailable) {
        return res.status(503).json({ error: "Kernel não disponível" });
      }

      const stopped = await stopKernelService(engineName);
      if (stopped) {
        res.json({ success: true, message: `Motor ${engineName} parado` });
      } else {
        res.status(500).json({ error: `Motor ${engineName} ja esta parado ou nao encontrado` });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/engine-room/engine/:name/start", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const engineName = req.params.name;

      if (engineName === "plus") {
        return res.status(400).json({ error: "Plus (Laravel) nao pode ser iniciado por aqui" });
      }
      if (engineName === "metaset") {
        return res.status(400).json({ error: "MetaSet (Java) nao pode ser iniciado por aqui" });
      }

      // Verificar se Kernel está disponível
      const kernelAvailable = await isKernelAvailable();
      if (!kernelAvailable) {
        return res.status(503).json({ error: "Kernel não disponível" });
      }

      const started = await startKernelService(engineName);
      if (started) {
        res.json({ success: true, message: `Motor ${engineName} iniciando...` });
      } else {
        res.status(500).json({ error: `Falha ao iniciar motor ${engineName}` });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/engine-room/engine/:name/info", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const engineName = req.params.name;

      if (engineName === "plus") {
        return res.json({ name: "plus", port: 8080, status: "managed-externally", message: "Plus e gerenciado separadamente" });
      }
      if (engineName === "metaset") {
        return res.json({ name: "metaset", port: 8088, status: "managed-externally", message: "MetaSet e gerenciado separadamente (Java)" });
      }

      const info = await getKernelServiceInfo(engineName);
      if (!info) {
        return res.status(404).json({ error: "Servico nao encontrado no gerenciador" });
      }

      res.json(info);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/engine-room/engine/:name/logs", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const engineName = req.params.name;

      // Serviços externos não têm logs via Kernel
      if (engineName === "plus" || engineName === "metaset") {
        return res.json({ engine: engineName, lines: 0, logs: [], message: "Logs nao disponiveis para servicos gerenciados externamente" });
      }

      const lines = parseInt(req.query.lines as string) || 50;
      const logs = await getKernelServiceLogs(engineName, lines);

      res.json({ engine: engineName, lines: logs.length, logs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  console.log("[Engine Room] Rotas registradas em /api/engine-room/* (usando Kernel Adapter)");
}
