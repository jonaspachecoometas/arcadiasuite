import type { Express, Request, Response } from "express";

const MIROFLOW_HOST = process.env.MIROFLOW_HOST || "localhost";
const MIROFLOW_PORT = parseInt(process.env.MIROFLOW_PORT || "8006", 10);
const MIROFLOW_URL = `http://${MIROFLOW_HOST}:${MIROFLOW_PORT}`;
const MIROFLOW_TIMEOUT = 600_000; // 10 minutos
const MIROFLOW_HEALTH_TIMEOUT = 5_000;

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
      const inputBody = {
        ...req.body,
        tenant_id: (req.user as any)?.tenantId ?? null,
      };
      const data = await proxyToMiroFlow("/analyze", "POST", inputBody);
      res.json(data);
    } catch (err: any) {
      console.error("[MiroFlow] erro:", err.message);
      res.status(502).json({ error: err.message });
    }
  });

  console.log(`[MiroFlow Proxy] Rotas registradas -> ${MIROFLOW_URL}`);
}
