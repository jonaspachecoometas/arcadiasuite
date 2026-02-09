import type { Express, Request, Response } from "express";
import { restartManagedService, stopManagedService, getManagedServiceInfo, getManagedServiceLogs } from "../index";

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
    displayName: "MetaSet (Motor BI)",
    type: "java",
    port: 8088,
    healthPath: "/api/health",
    category: "data",
    description: "Motor de BI - Consultas, Dashboards, Gráficos, Análises",
  },
];

async function checkEngineHealth(engine: EngineConfig): Promise<any> {
  const url = `http://localhost:${engine.port}${engine.healthPath}`;
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

      const results = await Promise.all(ENGINES.map(checkEngineHealth));

      let agentsStatus: any[] = [];
      try {
        const { getAgentsStatus } = await import("../blackboard/agents");
        agentsStatus = getAgentsStatus();
      } catch {
        agentsStatus = [];
      }

      const online = results.filter((r) => r.status === "online").length;
      const total = results.length;

      res.json({
        engines: results,
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

  const ENGINE_NAME_MAP: Record<string, string> = {
    "contabil": "contabil",
    "fisco": "fisco",
    "bi-engine": "bi",
    "automation-engine": "automation",
    "metaset": "metaset",
  };

  app.post("/api/engine-room/engine/:name/restart", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const engineName = req.params.name;
      const serviceName = ENGINE_NAME_MAP[engineName];

      if (engineName === "plus") {
        return res.status(400).json({ error: "Plus (Laravel) nao pode ser reiniciado por aqui" });
      }

      if (!serviceName) {
        return res.status(404).json({ error: "Motor nao encontrado" });
      }

      const restarted = restartManagedService(serviceName);
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
      const serviceName = ENGINE_NAME_MAP[engineName];

      if (engineName === "plus") {
        return res.status(400).json({ error: "Plus (Laravel) nao pode ser parado por aqui" });
      }

      if (!serviceName) {
        return res.status(404).json({ error: "Motor nao encontrado" });
      }

      const stopped = stopManagedService(serviceName);
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
      const serviceName = ENGINE_NAME_MAP[engineName];

      if (engineName === "plus") {
        return res.status(400).json({ error: "Plus (Laravel) nao pode ser iniciado por aqui" });
      }

      if (!serviceName) {
        return res.status(404).json({ error: "Motor nao encontrado" });
      }

      const restarted = restartManagedService(serviceName);
      if (restarted) {
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
      const serviceName = ENGINE_NAME_MAP[engineName];

      if (!serviceName) {
        if (engineName === "plus") {
          return res.json({ name: "plus", port: 8080, status: "managed-externally", message: "Plus e gerenciado separadamente" });
        }
        return res.status(404).json({ error: "Motor nao encontrado" });
      }

      const info = getManagedServiceInfo(serviceName);
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
      const serviceName = ENGINE_NAME_MAP[engineName];

      if (!serviceName) {
        return res.status(404).json({ error: "Motor nao encontrado" });
      }

      const lines = parseInt(req.query.lines as string) || 50;
      const logs = getManagedServiceLogs(serviceName, lines);

      res.json({ engine: engineName, lines: logs.length, logs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  console.log("[Engine Room] Rotas registradas em /api/engine-room/*");
}
