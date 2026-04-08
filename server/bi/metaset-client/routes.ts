/**
 * MetaSet Routes - Express routes for MetaSet BI integration
 * Arcádia Suite
 * 
 * Substitui as rotas legadas em /server/metaset/routes.ts
 */

import type { Express, Request, Response } from "express";
import { metasetClient } from "./index";

const METASET_HOST = process.env.METASET_HOST || "metaset";
const METASET_PORT = parseInt(process.env.METASET_PORT || "8100", 10);
const METASET_URL = `http://${METASET_HOST}:${METASET_PORT}`;

export function registerMetaSetRoutes(app: Express): void {

  // =============================================================================
  // HEALTH & STATUS
  // =============================================================================

  app.get("/api/bi/metaset/health", async (_req: Request, res: Response) => {
    try {
      const health = await metasetClient.isHealthy();
      res.json({ service: "MetaSet", ...health });
    } catch (err: any) {
      res.json({ service: "MetaSet", online: false, error: err.message });
    }
  });

  // =============================================================================
  // DATABASES
  // =============================================================================

  app.get("/api/bi/metaset/databases", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const databases = await metasetClient.listDatabases();
      res.json(databases);
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  app.get("/api/bi/metaset/databases/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const database = await metasetClient.getDatabase(parseInt(req.params.id));
      res.json(database);
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  app.post("/api/bi/metaset/databases", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const { name, engine, configuration } = req.body;
      if (!name || !engine || !configuration) {
        return res.status(400).json({ error: "name, engine, and configuration are required" });
      }
      const database = await metasetClient.createDatabase({ name, engine, configuration });
      res.json(database);
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  app.post("/api/bi/metaset/databases/:id/sync", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      await metasetClient.syncDatabaseSchema(parseInt(req.params.id));
      res.json({ success: true, message: "Sincronização iniciada" });
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  // =============================================================================
  // TABLES
  // =============================================================================

  app.get("/api/bi/metaset/databases/:id/tables", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const tables = await metasetClient.getDatabaseTables(parseInt(req.params.id));
      res.json(tables);
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  app.get("/api/bi/metaset/tables/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const metadata = await metasetClient.getTableMetadata(parseInt(req.params.id));
      res.json(metadata);
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  // =============================================================================
  // SQL QUERIES
  // =============================================================================

  app.post("/api/bi/metaset/query", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const { databaseId, query, limit } = req.body;
      if (!databaseId || !query) {
        return res.status(400).json({ error: "databaseId and query are required" });
      }
      const result = await metasetClient.executeSql(databaseId, query, { limit });
      res.json(result);
    } catch (err: any) {
      const status = err.message.includes("permitidas") || err.message.includes("proibidos") 
        ? 400 
        : 502;
      res.status(status).json({ error: err.message });
    }
  });

  // =============================================================================
  // CHARTS
  // =============================================================================

  app.get("/api/bi/metaset/charts", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const charts = await metasetClient.listCharts();
      res.json(charts);
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  app.get("/api/bi/metaset/charts/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const chart = await metasetClient.getChart(parseInt(req.params.id));
      res.json(chart);
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  app.post("/api/bi/metaset/charts", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const { name, datasetId, vizType, params } = req.body;
      if (!name || !datasetId || !vizType) {
        return res.status(400).json({ error: "name, datasetId, and vizType are required" });
      }
      const chart = await metasetClient.createChart({
        name,
        datasetId,
        vizType,
        params: params || {},
      });
      res.json(chart);
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  app.delete("/api/bi/metaset/charts/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      await metasetClient.deleteChart(parseInt(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  // =============================================================================
  // DASHBOARDS
  // =============================================================================

  app.get("/api/bi/metaset/dashboards", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const dashboards = await metasetClient.listDashboards();
      res.json(dashboards);
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  app.get("/api/bi/metaset/dashboards/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const dashboard = await metasetClient.getDashboard(parseInt(req.params.id));
      res.json(dashboard);
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  app.post("/api/bi/metaset/dashboards", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const { name, description, published } = req.body;
      if (!name) return res.status(400).json({ error: "name is required" });
      const dashboard = await metasetClient.createDashboard({ name, description, published });
      res.json(dashboard);
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  app.put("/api/bi/metaset/dashboards/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const { name, description, published } = req.body;
      const dashboard = await metasetClient.updateDashboard(parseInt(req.params.id), {
        name,
        description,
        published,
      });
      res.json(dashboard);
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  app.delete("/api/bi/metaset/dashboards/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      await metasetClient.deleteDashboard(parseInt(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  // =============================================================================
  // EMBEDDING
  // =============================================================================

  app.post("/api/bi/metaset/guest-token", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const { resources, rls, user } = req.body;
      if (!resources || !Array.isArray(resources)) {
        return res.status(400).json({ error: "resources array is required" });
      }
      const token = await metasetClient.createGuestToken({ resources, rls, user });
      res.json({ token });
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  app.get("/api/bi/metaset/embed/dashboard/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const dashboardId = req.params.id;
      const tenantId = req.headers['x-tenant-id'] || '1';
      
      // Cria guest token para embedding
      const token = await metasetClient.createGuestToken({
        resources: [{ type: "dashboard", id: dashboardId }],
        rls: [{ dataset: 0, clause: `tenant_id = ${tenantId}` }],
      });

      res.json({
        embed_url: `${METASET_URL}/embedded/${dashboardId}?token=${token}`,
        dashboard_id: dashboardId,
        tenant_id: tenantId,
        guest_token: token,
      });
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  // =============================================================================
  // UTILS
  // =============================================================================

  app.get("/api/bi/metaset/suggest/:tableName", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const suggestions = await metasetClient.getAutoSuggestions(req.params.tableName);
      res.json(suggestions);
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  // =============================================================================
  // PROXY PARA ENDPOINTS NATIVOS DO SUPERSET
  // =============================================================================

  app.all("/bi/metaset/proxy/*", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      
      const targetPath = req.path.replace("/bi/metaset/proxy", "");
      const targetUrl = `${METASET_URL}${targetPath}`;

      console.log(`[MetaSet Proxy] ${req.method} ${targetPath}`);

      const fetchOptions: any = {
        method: req.method,
        headers: {
          "Content-Type": req.headers["content-type"] || "application/json",
          "Authorization": req.headers.authorization || "",
        },
      };

      if (req.method !== "GET" && req.method !== "HEAD") {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const response = await fetch(targetUrl, fetchOptions);
      const body = await response.text();

      res.status(response.status);
      res.setHeader("Content-Type", response.headers.get("content-type") || "application/json");
      res.send(body);
    } catch (error: any) {
      console.error("[MetaSet Proxy] Error:", error.message);
      res.status(503).json({ error: "MetaSet temporarily unavailable" });
    }
  });

  console.log("[MetaSet] Rotas registradas em /api/bi/metaset/*");
}
