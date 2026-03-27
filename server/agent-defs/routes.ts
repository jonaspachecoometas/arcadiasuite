/**
 * Agent Definitions Routes — Phase 6
 * Dev Center: Fábrica de Agentes (Design → Assemble → Deploy)
 */

import { Router, Request, Response } from "express";
import { db } from "../../db/index";
import { arcadiaAgentDefs, insertAgentDefSchema } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { blackboardService } from "../blackboard/service";

const router = Router();

// GET /api/agent-defs — listar todos (filtro por status opcional)
router.get("/", async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const tenantId = (req.user as any)?.tenantId?.toString() || null;

    let query = db.select().from(arcadiaAgentDefs).orderBy(desc(arcadiaAgentDefs.updatedAt));

    const defs = await query;

    const filtered = defs.filter(d => {
      const tenantMatch = !tenantId || !d.tenantId || d.tenantId === tenantId;
      const statusMatch = !status || d.status === status;
      return tenantMatch && statusMatch;
    });

    res.json({ success: true, data: filtered });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/agent-defs/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [def] = await db.select().from(arcadiaAgentDefs).where(eq(arcadiaAgentDefs.id, id));
    if (!def) return res.status(404).json({ success: false, error: "Não encontrado" });
    res.json({ success: true, data: def });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/agent-defs — criar
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id || "anonymous";
    const tenantId = (req.user as any)?.tenantId?.toString() || null;

    const parsed = insertAgentDefSchema.safeParse({ ...req.body, userId, tenantId });
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.message });
    }

    const [created] = await db.insert(arcadiaAgentDefs).values(parsed.data).returning();
    res.json({ success: true, data: created });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/agent-defs/:id — atualizar
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, spec } = req.body;

    const updates: any = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (spec !== undefined) updates.spec = spec;

    const [updated] = await db
      .update(arcadiaAgentDefs)
      .set(updates)
      .where(eq(arcadiaAgentDefs.id, id))
      .returning();

    if (!updated) return res.status(404).json({ success: false, error: "Não encontrado" });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/agent-defs/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(arcadiaAgentDefs).where(eq(arcadiaAgentDefs.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/agent-defs/:id/assemble — montar via Blackboard
router.post("/:id/assemble", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const userId = (req.user as any)?.id || "anonymous";

    const [def] = await db.select().from(arcadiaAgentDefs).where(eq(arcadiaAgentDefs.id, id));
    if (!def) return res.status(404).json({ success: false, error: "Não encontrado" });

    const spec = def.spec as any;
    const specContent = spec?.content || JSON.stringify(spec);

    const task = await blackboardService.createMainTask(
      `Montar agente: ${def.name}`,
      specContent,
      userId,
      { agentDefId: id, spec, source: "agent-factory" }
    );

    await blackboardService.createSubtask(
      task.id,
      "Projetar agente",
      `Analisar spec e criar estrutura do agente: ${def.name}\n\n${specContent}`,
      "architect",
      [],
      { phase: "design", agentDefId: id }
    );

    const [updated] = await db
      .update(arcadiaAgentDefs)
      .set({ status: "assembling", lastTaskId: task.id, updatedAt: new Date() })
      .where(eq(arcadiaAgentDefs.id, id))
      .returning();

    res.json({ success: true, data: updated, taskId: task.id });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/agent-defs/:id/deploy — marcar como deployed
router.post("/:id/deploy", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const [def] = await db.select().from(arcadiaAgentDefs).where(eq(arcadiaAgentDefs.id, id));
    if (!def) return res.status(404).json({ success: false, error: "Não encontrado" });
    if (def.status !== "ready") {
      return res.status(400).json({ success: false, error: "Agente precisa estar 'ready' para deploy" });
    }

    const [updated] = await db
      .update(arcadiaAgentDefs)
      .set({ status: "deployed", version: (def.version || 1) + 1, updatedAt: new Date() })
      .where(eq(arcadiaAgentDefs.id, id))
      .returning();

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/agent-defs/:id/redraft — volta para draft para remontar
router.post("/:id/redraft", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const [updated] = await db
      .update(arcadiaAgentDefs)
      .set({ status: "draft", updatedAt: new Date() })
      .where(eq(arcadiaAgentDefs.id, id))
      .returning();

    if (!updated) return res.status(404).json({ success: false, error: "Não encontrado" });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/agent-defs/:id/run — executar agente via Blackboard
router.post("/:id/run", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const userId = (req.user as any)?.id || "anonymous";

    const [def] = await db.select().from(arcadiaAgentDefs).where(eq(arcadiaAgentDefs.id, id));
    if (!def) return res.status(404).json({ success: false, error: "Não encontrado" });

    const spec = def.spec as any;
    const specContent = spec?.content || JSON.stringify(spec);

    const task = await blackboardService.createMainTask(
      `Executar agente: ${def.name}`,
      specContent,
      userId,
      { agentDefId: id, spec, source: "agent-run" }
    );

    await blackboardService.createSubtask(
      task.id,
      "Executar agente",
      `Executar o agente conforme spec:\n\n${specContent}`,
      "executor",
      [],
      { phase: "execution", agentDefId: id }
    );

    res.json({ success: true, taskId: task.id });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/agent-defs/:id/fork — duplicar como novo draft
router.post("/:id/fork", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const userId = (req.user as any)?.id || "anonymous";
    const tenantId = (req.user as any)?.tenantId?.toString() || null;

    const [def] = await db.select().from(arcadiaAgentDefs).where(eq(arcadiaAgentDefs.id, id));
    if (!def) return res.status(404).json({ success: false, error: "Não encontrado" });

    const [forked] = await db.insert(arcadiaAgentDefs).values({
      name: `${def.name} (cópia)`,
      description: def.description,
      spec: def.spec as any,
      status: "draft",
      version: 1,
      tenantId,
      userId,
    }).returning();

    res.json({ success: true, data: forked });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
