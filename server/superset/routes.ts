import type { Express, Request, Response } from "express";
import { createMiroFlowBridge } from "./MiroFlowBridge";

const SUPERSET_HOST = process.env.SUPERSET_HOST || "localhost";
const SUPERSET_PORT = parseInt(process.env.SUPERSET_PORT || "8088", 10);
const SUPERSET_URL = `http://${SUPERSET_HOST}:${SUPERSET_PORT}`;
const ADMIN_USER = process.env.SUPERSET_ADMIN_USER || "admin";
const ADMIN_PASS = process.env.SUPERSET_ADMIN_PASSWORD || "arcadia2026";

const miroflowBridge = createMiroFlowBridge();

// Cache do service token (válido por 50 min)
let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getServiceToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const resp = await fetch(`${SUPERSET_URL}/api/v1/security/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS, provider: "db", refresh: true }),
  });

  if (!resp.ok) throw new Error(`Falha ao autenticar no Superset (${resp.status})`);
  const data = await resp.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + 50 * 60 * 1000;
  return cachedToken!;
}

export function registerSupersetRoutes(app: Express): void {

  // Gera Guest Token para embedding em qualquer tela
  app.post("/api/superset/guest-token", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });

      const { dashboardId } = req.body;
      if (!dashboardId) return res.status(400).json({ error: "dashboardId é obrigatório" });

      const token = await getServiceToken();
      const user = req.user as any;

      const guestResp = await fetch(`${SUPERSET_URL}/api/v1/security/guest_token/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          user: {
            username: `arcadia_${user?.id || "guest"}`,
            first_name: user?.name?.split(" ")[0] || "Arcádia",
            last_name: user?.name?.split(" ").slice(1).join(" ") || "User",
          },
          resources: [{ type: "dashboard", id: dashboardId }],
          rls: [],
        }),
      });

      if (!guestResp.ok) {
        const errText = await guestResp.text();
        return res.status(502).json({ error: "Falha ao gerar guest token", detail: errText });
      }

      const { token: guestToken } = await guestResp.json();
      res.json({ token: guestToken, supersetUrl: "/superset" });
    } catch (err: any) {
      console.error("[Superset] guest-token error:", err.message);
      res.status(502).json({ error: err.message });
    }
  });

  // Lista dashboards disponíveis (para seletor na UI)
  app.get("/api/superset/dashboards", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });

      const token = await getServiceToken();
      const resp = await fetch(
        `${SUPERSET_URL}/api/v1/dashboard/?q=(order_column:changed_on_delta_humanized,order_direction:desc,page_size:50)`,
        { headers: { "Authorization": `Bearer ${token}` } }
      );

      if (!resp.ok) return res.status(502).json({ error: "Superset indisponível", dashboards: [] });
      const data = await resp.json();
      res.json(data.result || []);
    } catch (err: any) {
      console.error("[Superset] dashboards error:", err.message);
      res.status(502).json({ error: err.message, dashboards: [] });
    }
  });

  // Health check
  app.get("/api/superset/health", async (_req: Request, res: Response) => {
    try {
      const resp = await fetch(`${SUPERSET_URL}/health`, { signal: AbortSignal.timeout(5000) });
      const text = await resp.text();
      res.json({ online: resp.ok && text === "OK", url: SUPERSET_URL, status: text });
    } catch {
      res.json({ online: false, url: SUPERSET_URL });
    }
  });

  // Autologin (compatibilidade — redireciona para /superset com sessão)
  app.get("/api/bi/superset/autologin", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    res.redirect("/superset/login");
  });

  // ============================================================================
  // MiroFlow Bridge Routes
  // ============================================================================

  /**
   * POST /api/superset/miroflow/analyze
   * Enriquece dataset Superset com análises científicas via MiroFlow
   *
   * Request body:
   * {
   *   "dataset": { "data": [...], "columns": [...] },
   *   "config": { "type": "forecast|anomaly|exploratory", "horizon": 30, "confidence_level": 0.95 }
   * }
   *
   * Response:
   * {
   *   "success": true,
   *   "data": { ...enriched dataset with _miroflow_analysis, _anomaly_scores, etc },
   *   "analysis": { "summary": "...", "analysis_type": "..." },
   *   "execution_id": "uuid"
   * }
   */
  app.post("/api/superset/miroflow/analyze", async (req: Request, res: Response) => {
    await miroflowBridge.handleAnalyzeRequest(req, res);
  });

  /**
   * GET /api/superset/miroflow/health
   * Verifica conexão com MiroFlow bridge
   */
  app.get("/api/superset/miroflow/health", async (_req: Request, res: Response) => {
    try {
      const miroflowUrl = process.env.MIROFLOW_URL || "http://localhost:8006";
      const response = await fetch(`${miroflowUrl}/health`, {
        signal: AbortSignal.timeout(5_000),
      });
      const data = await response.json();
      res.json({
        online: response.ok,
        miroflow: data,
        bridge: "operational",
        endpoints: {
          analyze: "/api/superset/miroflow/analyze",
          health: "/api/superset/miroflow/health",
        },
      });
    } catch (err: any) {
      res.json({
        online: false,
        error: err.message,
        bridge: "offline",
      });
    }
  });

  /**
   * POST /api/superset/miroflow/create-dashboard
   * Cria um dashboard no Superset baseado em análise MiroFlow
   */
  app.post("/api/superset/miroflow/create-dashboard", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    try {
      const { dashboardTitle, sqlQuery, analysisId, agent, task, insights } = req.body;

      if (!dashboardTitle || !sqlQuery || !analysisId) {
        return res.status(400).json({ error: "dashboardTitle, sqlQuery e analysisId são obrigatórios" });
      }

      const token = await getServiceToken();
      const user = req.user as any;

      // 1. Criar dataset no Superset
      const datasetResp = await fetch(`${SUPERSET_URL}/api/v1/datasets/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          database: 1, // ID do banco "Arcádia Suite"
          table_name: `miroflow_${analysisId.substring(0, 8)}`,
          sql: sqlQuery,
        }),
      });

      if (!datasetResp.ok) {
        const err = await datasetResp.json().catch(() => ({ detail: "Erro ao criar dataset" }));
        throw new Error(`Falha ao criar dataset: ${err.detail}`);
      }

      const dataset = await datasetResp.json();
      const datasetId = dataset.id;

      // 2. Criar chart automático
      const chartResp = await fetch(`${SUPERSET_URL}/api/v1/chart/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          datasource_id: datasetId,
          datasource_type: "table",
          chart_type: "table", // Começar com table, depois adicionar mais tipos
          name: `${dashboardTitle} - Dados`,
          description: `Criado via MiroFlow Analysis (${agent})`,
        }),
      });

      if (!chartResp.ok) {
        const err = await chartResp.json().catch(() => ({ detail: "Erro ao criar chart" }));
        throw new Error(`Falha ao criar chart: ${err.detail}`);
      }

      const chart = await chartResp.json();
      const chartId = chart.id;

      // 3. Criar dashboard
      const dashboardResp = await fetch(`${SUPERSET_URL}/api/v1/dashboard/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          dashboard_title: dashboardTitle,
          description: `Análise MiroFlow - ${agent} - ${new Date().toLocaleString('pt-BR')}`,
        }),
      });

      if (!dashboardResp.ok) {
        const err = await dashboardResp.json().catch(() => ({ detail: "Erro ao criar dashboard" }));
        throw new Error(`Falha ao criar dashboard: ${err.detail}`);
      }

      const dashboard = await dashboardResp.json();
      const dashboardId = dashboard.id;

      // 4. Adicionar chart ao dashboard
      const updateResp = await fetch(`${SUPERSET_URL}/api/v1/dashboard/${dashboardId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          dashboard_title: dashboardTitle,
          slices: [chartId],
        }),
      });

      if (!updateResp.ok) {
        throw new Error("Falha ao adicionar chart ao dashboard");
      }

      // 5. Salvar referência no banco Arcádia
      const db = await import("../db/index.js");
      await db.query(
        `INSERT INTO miroflow_generated_dashboards
         (analysis_id, agent, task, insights, dashboard_id, dashboard_title, dataset_name, sql_query, created_by, tenant_id, superset_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          analysisId,
          agent || "unknown",
          task || "",
          JSON.stringify(insights || {}),
          dashboardId,
          dashboardTitle,
          `miroflow_${analysisId.substring(0, 8)}`,
          sqlQuery,
          user.id,
          user.tenantId || null,
          `${SUPERSET_URL}/superset/dashboard/${dashboardId}/`,
        ]
      );

      res.json({
        success: true,
        dashboardId,
        dashboardUrl: `${SUPERSET_URL}/superset/dashboard/${dashboardId}/`,
        message: `Dashboard "${dashboardTitle}" criado com sucesso!`,
      });
    } catch (err: any) {
      console.error("[Superset] Erro ao criar dashboard:", err.message);
      res.status(502).json({
        error: err.message,
        source: "superset_create_dashboard",
      });
    }
  });

  console.log("[Superset] MiroFlow Bridge registered at /api/superset/miroflow");
}
