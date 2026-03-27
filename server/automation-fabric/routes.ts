/**
 * Automation Fabric Routes — Phase 5
 *
 * GET  /api/automation-fabric/list        — lista unificada Central + XOS
 * POST /api/automation-fabric/:id/run     — executa via fabric
 * PATCH /api/automation-fabric/:id/toggle — ativa/desativa
 */

import type { Express, Request, Response } from "express";
import { automationFabricService } from "./service";

export function registerAutomationFabricRoutes(app: Express): void {

  // ── Lista unificada ──────────────────────────────────────────────────────────
  app.get("/api/automation-fabric/list", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });

    try {
      const tenantId = (req as any).user?.tenantId ?? null;
      const list = await automationFabricService.list(tenantId);
      res.json({ automations: list, total: list.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Executar ─────────────────────────────────────────────────────────────────
  app.post("/api/automation-fabric/:id/run", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });

    const fabricId = decodeURIComponent(req.params.id);
    const userId = (req as any).user?.id ?? "";

    try {
      const result = await automationFabricService.run(fabricId, userId, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Toggle ativo/inativo ─────────────────────────────────────────────────────
  app.patch("/api/automation-fabric/:id/toggle", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });

    const fabricId = decodeURIComponent(req.params.id);
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ error: "isActive deve ser boolean" });
    }

    try {
      await automationFabricService.toggle(fabricId, isActive);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
