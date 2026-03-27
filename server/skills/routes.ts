// server/skills/routes.ts
// CRUD + execução + histórico de skills

import { Router } from "express";
import { db } from "../../db";
import { skills, skillExecutions } from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { insertSkillSchema } from "../../shared/schema";
import { skillEngine } from "./engine";

const router = Router();

// ── Listar skills do tenant ────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId as number | undefined;
    const where = tenantId ? eq(skills.tenantId, tenantId) : undefined;
    const rows = await db.select().from(skills).where(where).orderBy(desc(skills.createdAt));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar skills" });
  }
});

// ── Buscar skill por id ────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const [skill] = await db.select().from(skills).where(eq(skills.id, req.params.id)).limit(1);
    if (!skill) return res.status(404).json({ error: "Skill não encontrada" });
    res.json(skill);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar skill" });
  }
});

// ── Criar skill ────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId as number | undefined;
    const parsed = insertSkillSchema.safeParse({ ...req.body, tenantId });
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const [skill] = await db.insert(skills).values(parsed.data).returning();
    res.status(201).json(skill);
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "Slug já existe neste tenant" });
    res.status(500).json({ error: "Erro ao criar skill" });
  }
});

// ── Atualizar skill ────────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const [skill] = await db.update(skills)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(skills.id, req.params.id))
      .returning();
    if (!skill) return res.status(404).json({ error: "Skill não encontrada" });
    res.json(skill);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar skill" });
  }
});

// ── Deletar (arquivar) skill ───────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    await db.update(skills)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(skills.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Erro ao arquivar skill" });
  }
});

// ── Executar skill ─────────────────────────────────────────────────────────
router.post("/:id/execute", async (req, res) => {
  try {
    const [skill] = await db.select().from(skills).where(eq(skills.id, req.params.id)).limit(1);
    if (!skill) return res.status(404).json({ error: "Skill não encontrada" });

    const tenantId = (req as any).tenantId as number | undefined;
    const userId = (req as any).user?.id as string | undefined;

    const result = await skillEngine.execute(skill.slug, {
      parameters: req.body.parameters ?? {},
      triggeredBy: "manual",
      triggeredByUserId: userId,
      ctx: { tenantId, userId },
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao executar skill" });
  }
});

// ── Histórico de execuções ─────────────────────────────────────────────────
router.get("/:id/executions", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const rows = await db.select().from(skillExecutions)
      .where(eq(skillExecutions.skillId, req.params.id))
      .orderBy(desc(skillExecutions.startedAt))
      .limit(limit);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar histórico" });
  }
});

export default router;

export function registerSkillRoutes(app: any): void {
  app.use("/api/skills", router);
}
