// server/modules/skill-fabric/src/api/controllers/skills.controller.ts
// Controller layer — orchestrates validation, compilation, persistence, lifecycle

import type { Request, Response } from "express";
import { db } from "../../../../../../db";
import { skills, skillExecutions } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { insertSkillSchema } from "@shared/schema";
import { codeCompiler } from "../../core/compiler/CodeCompiler";
import { markdownCompiler } from "../../core/compiler/MarkdownCompiler";
import { validationPipeline } from "../../core/validator/ValidationPipeline";
import { skillExecutor } from "../../core/executor/SkillExecutor";
import { lifecycleManager } from "../../core/lifecycle/LifecycleManager";
import type { CreateSkillFabricDto, UpdateSkillFabricDto, SkillMode } from "../../types";

// ── Helpers ────────────────────────────────────────────────────────────────────

function getTenant(req: Request): number | undefined {
  return (req as unknown as { tenantId?: number }).tenantId;
}

function getUserId(req: Request): string | undefined {
  return (req as unknown as { user?: { id: string } }).user?.id;
}

function compile(mode: SkillMode, source: string, name?: string) {
  if (mode === "code") return codeCompiler.compile({ mode, source, name });
  if (mode === "markdown") return markdownCompiler.compile({ mode, source, name });
  // visual — not yet wired to a full UI, fallback to markdown
  return markdownCompiler.compile({ mode: "markdown", source, name });
}

// ── Controllers ────────────────────────────────────────────────────────────────

export async function listSkills(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = getTenant(req);
    const where = tenantId ? eq(skills.tenantId, tenantId) : undefined;
    const rows = await db.select().from(skills).where(where).orderBy(desc(skills.createdAt));
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Erro ao listar skills" });
  }
}

export async function getSkill(req: Request, res: Response): Promise<void> {
  try {
    const [skill] = await db.select().from(skills).where(eq(skills.id, req.params.id)).limit(1);
    if (!skill) { res.status(404).json({ error: "Skill não encontrada" }); return; }
    res.json(skill);
  } catch {
    res.status(500).json({ error: "Erro ao buscar skill" });
  }
}

export async function createSkill(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = getTenant(req);
    const userId = getUserId(req);
    const dto = req.body as CreateSkillFabricDto;

    // 1. Domain validation
    const validation = validationPipeline.validateCreate(dto);
    if (!validation.valid) {
      res.status(400).json({ error: "Validação falhou", details: validation.errors, warnings: validation.warnings });
      return;
    }

    // 2. Compile source → body
    const compiled = compile(dto.mode, dto.source, dto.name);
    if (!compiled.ok) {
      res.status(422).json({ error: "Falha na compilação", details: compiled.errors, warnings: compiled.warnings });
      return;
    }

    // 3. Build insert payload using existing schema
    const payload = insertSkillSchema.safeParse({
      name: dto.name,
      slug: dto.slug,
      namespace: dto.namespace ?? "tenant",
      description: dto.description,
      version: dto.version ?? "1.0.0",
      tags: dto.tags ?? [],
      body: compiled.body,
      parametersSchema: dto.parametersSchema ?? {},
      returnSchema: dto.returnSchema ?? {},
      status: "draft",
      tenantId,
      createdBy: userId,
    });

    if (!payload.success) {
      res.status(400).json({ error: "Payload inválido", details: payload.error.flatten() });
      return;
    }

    const [skill] = await db.insert(skills).values(payload.data).returning();
    res.status(201).json({ skill, warnings: compiled.warnings });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === "23505") { res.status(409).json({ error: "Slug já existe neste tenant" }); return; }
    res.status(500).json({ error: "Erro ao criar skill" });
  }
}

export async function updateSkill(req: Request, res: Response): Promise<void> {
  try {
    const dto = req.body as UpdateSkillFabricDto;

    // 1. Domain validation
    const validation = validationPipeline.validateUpdate(dto);
    if (!validation.valid) {
      res.status(400).json({ error: "Validação falhou", details: validation.errors, warnings: validation.warnings });
      return;
    }

    // 2. If source provided, compile it
    let body: string | undefined;
    let compileWarnings: string[] = [];
    if (dto.source) {
      const mode = dto.mode ?? "markdown";
      const compiled = compile(mode, dto.source);
      if (!compiled.ok) {
        res.status(422).json({ error: "Falha na compilação", details: compiled.errors });
        return;
      }
      body = compiled.body;
      compileWarnings = compiled.warnings ?? [];
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.name) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.version) updateData.version = dto.version;
    if (dto.tags) updateData.tags = dto.tags;
    if (dto.parametersSchema) updateData.parametersSchema = dto.parametersSchema;
    if (dto.returnSchema) updateData.returnSchema = dto.returnSchema;
    if (body !== undefined) updateData.body = body;

    const [skill] = await db.update(skills)
      .set(updateData)
      .where(eq(skills.id, req.params.id))
      .returning();

    if (!skill) { res.status(404).json({ error: "Skill não encontrada" }); return; }
    res.json({ skill, warnings: compileWarnings });
  } catch {
    res.status(500).json({ error: "Erro ao atualizar skill" });
  }
}

export async function compileSkill(req: Request, res: Response): Promise<void> {
  try {
    const { mode, source } = req.body as { mode: SkillMode; source: string };
    if (!mode || !source) {
      res.status(400).json({ error: "mode e source são obrigatórios" });
      return;
    }
    const result = compile(mode, source);
    res.json(result);
  } catch {
    res.status(500).json({ error: "Erro ao compilar" });
  }
}

export async function publishSkill(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const result = await lifecycleManager.publish(req.params.id, userId);
    if (!result.ok) { res.status(400).json({ error: result.error }); return; }
    res.json({ ok: true, message: "Skill publicada com sucesso" });
  } catch {
    res.status(500).json({ error: "Erro ao publicar skill" });
  }
}

export async function archiveSkill(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const result = await lifecycleManager.archive(req.params.id, userId);
    if (!result.ok) { res.status(400).json({ error: result.error }); return; }
    res.json({ ok: true, message: "Skill arquivada com sucesso" });
  } catch {
    res.status(500).json({ error: "Erro ao arquivar skill" });
  }
}

export async function bumpVersion(req: Request, res: Response): Promise<void> {
  try {
    const result = await lifecycleManager.bumpVersion(req.params.id);
    if (!result.ok) { res.status(400).json({ error: result.error }); return; }
    res.json({ ok: true, version: result.version });
  } catch {
    res.status(500).json({ error: "Erro ao bumpar versão" });
  }
}

export async function executeSkill(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = getTenant(req);
    const userId = getUserId(req);
    const result = await skillExecutor.execute({
      skillId: req.params.id,
      parameters: req.body.parameters ?? {},
      tenantId,
      userId,
      timeout: req.body.timeout ?? 5000,
    });
    res.json(result);
  } catch {
    res.status(500).json({ error: "Erro ao executar skill" });
  }
}

export async function getExecutions(req: Request, res: Response): Promise<void> {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const rows = await db.select().from(skillExecutions)
      .where(eq(skillExecutions.skillId, req.params.id))
      .orderBy(desc(skillExecutions.startedAt))
      .limit(limit);
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Erro ao buscar execuções" });
  }
}
