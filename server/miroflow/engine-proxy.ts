import type { Express, Request, Response } from "express";
import { randomUUID } from "node:crypto";

const MIROFLOW_HOST = process.env.MIROFLOW_HOST || "localhost";
const MIROFLOW_PORT = parseInt(process.env.MIROFLOW_PORT || "8006", 10);
const MIROFLOW_URL = `http://${MIROFLOW_HOST}:${MIROFLOW_PORT}`;
const MIROFLOW_TIMEOUT = 600_000; // 10 minutos
const MIROFLOW_HEALTH_TIMEOUT = 5_000;

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

const AGENT_CONFIGS: Record<string, { model: string; system: string }> = {
  statistician: {
    model: "deepseek-r1:14b",
    system:
      "Você é um estatístico especializado em análise de dados empresariais. " +
      "Responda em português brasileiro. Forneça análises quantitativas claras, " +
      "com estatísticas descritivas, padrões e insights acionáveis. Seja preciso e objetivo.",
  },
  fiscal_auditor: {
    model: "deepseek-r1:14b",
    system:
      "Você é um auditor fiscal especializado em compliance tributário brasileiro. " +
      "Responda em português brasileiro. Identifique inconsistências, riscos fiscais " +
      "e recomende ações corretivas. Cite legislação quando relevante.",
  },
  researcher: {
    model: "deepseek-r1:14b",
    system:
      "Você é um pesquisador analítico especializado em inteligência de negócios. " +
      "Responda em português brasileiro. Identifique correlações, tendências e " +
      "hipóteses baseadas em dados. Apresente achados de forma estruturada.",
  },
};

const FALLBACK_MODEL = "llama3.2:3b";

async function callOllama(model: string, system: string, prompt: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 300_000);
  try {
    const resp = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        stream: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) throw new Error(`Ollama error: ${resp.status}`);
    const data: any = await resp.json();
    return data.message?.content ?? "";
  } catch (err: any) {
    clearTimeout(timeout);
    throw err;
  }
}

async function proxyToMiroFlow(path: string, method: string = "GET", body?: object): Promise<any> {
  const timeoutMs = path === "/health" ? MIROFLOW_HEALTH_TIMEOUT : MIROFLOW_TIMEOUT;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${MIROFLOW_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(err.detail || `MiroFlow error: ${response.status}`);
    }
    return await response.json();
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === "AbortError") throw new Error("MiroFlow timeout (600s)");
    throw err;
  }
}

export function registerMiroFlowRoutes(app: Express): void {
  app.get("/api/miroflow/health", async (_req: Request, res: Response) => {
    try {
      const data = await proxyToMiroFlow("/health", "GET");
      res.json({ online: true, url: MIROFLOW_URL, ...data });
    } catch {
      res.json({ online: false, url: MIROFLOW_URL });
    }
  });

  app.post("/api/miroflow/analyze", async (req: Request, res: Response) => {
    console.log("[MiroFlow] POST /api/miroflow/analyze - começando");
    try {
      const { agent = "statistician", task, context } = req.body as {
        agent?: string;
        task: string;
        context?: Record<string, unknown>;
      };

      if (!task?.trim()) {
        return res.status(400).json({ error: "Campo 'task' é obrigatório" });
      }

      const agentKey = AGENT_CONFIGS[agent] ? agent : "statistician";
      const cfg = AGENT_CONFIGS[agentKey];

      let prompt = task;
      if (context && Object.keys(context).length > 0) {
        const ctxStr = Object.entries(context)
          .filter(([, v]) => v != null)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n");
        if (ctxStr) prompt = `Contexto disponível:\n${ctxStr}\n\nTarefa: ${task}`;
      }

      const start = Date.now();
      let model = cfg.model;
      let result: string;

      try {
        result = await callOllama(model, cfg.system, prompt);
      } catch {
        model = FALLBACK_MODEL;
        result = await callOllama(model, cfg.system, prompt);
      }

      res.json({
        execution_id: randomUUID(),
        agent: agentKey,
        model,
        result,
        duration_ms: Date.now() - start,
      });
    } catch (err: any) {
      console.error("[MiroFlow] erro:", err.message);
      res.status(502).json({ error: err.message });
    }
  });

  console.log(`[MiroFlow Proxy] Rotas registradas -> ${MIROFLOW_URL}`);
}
