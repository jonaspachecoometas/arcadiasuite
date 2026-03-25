import type { Express, Request, Response } from "express";
import { db } from "../../db/index";
import {
  arcadiaSkills,
  skillExecutions,
  insertArcadiaSkillSchema,
} from "@shared/schema";
import { eq, and, desc, ilike, or, ne } from "drizzle-orm";
import { z } from "zod";
import { skillEngine } from "./engine";
import { VersionManager } from "./versioning";

const versionManager = new VersionManager();

const executeBodySchema = z.object({
  inputParams: z.record(z.unknown()).optional(),
  triggeredBy: z
    .enum(["manual", "schedule", "automation", "agent", "webhook", "openclaw", "event"])
    .optional()
    .default("manual"),
  automationId: z.number().int().optional(),
  parentExecutionId: z.string().uuid().optional(),
});

const listQuerySchema = z.object({
  namespace: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

function tenantId(req: Request): number | undefined {
  return (req as any).user?.tenantId ?? (req as any).tenantId;
}

function userId(req: Request): string | undefined {
  return (req as any).user?.id ?? (req as any).userId;
}

export function registerSkillRoutes(app: Express): void {

  // ── Health ────────────────────────────────────────────────────────────────

  app.get("/api/skills/health", async (_req: Request, res: Response) => {
    try {
      const status = await skillEngine.health();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Listar skills ─────────────────────────────────────────────────────────

  app.get("/api/skills", async (req: Request, res: Response) => {
    try {
      const q = listQuerySchema.parse(req.query);
      const tid = tenantId(req);

      const conditions: any[] = [];
      if (tid) conditions.push(eq(arcadiaSkills.tenantId, tid));
      if (q.namespace) conditions.push(eq(arcadiaSkills.namespace, q.namespace));
      if (q.status) conditions.push(eq(arcadiaSkills.status, q.status as any));
      if (q.search) {
        conditions.push(
          or(
            ilike(arcadiaSkills.name, `%${q.search}%`),
            ilike(arcadiaSkills.slug, `%${q.search}%`),
            ilike(arcadiaSkills.description, `%${q.search}%`)
          )
        );
      }

      const skills = await db
        .select()
        .from(arcadiaSkills)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(arcadiaSkills.createdAt))
        .limit(q.limit)
        .offset(q.offset);

      res.json({ skills, total: skills.length });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ── Criar skill ───────────────────────────────────────────────────────────

  app.post("/api/skills", async (req: Request, res: Response) => {
    try {
      const tid = tenantId(req);
      const uid = userId(req);
      const data = insertArcadiaSkillSchema.parse({
        ...req.body,
        tenantId: tid,
        createdBy: uid,
      });

      const [skill] = await db.insert(arcadiaSkills).values(data).returning();
      res.status(201).json(skill);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ── Buscar skill por ID ───────────────────────────────────────────────────

  app.get("/api/skills/:id", async (req: Request, res: Response) => {
    try {
      const [skill] = await db
        .select()
        .from(arcadiaSkills)
        .where(eq(arcadiaSkills.id, req.params.id))
        .limit(1);

      if (!skill) return res.status(404).json({ error: "Skill não encontrada" });
      res.json(skill);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ── Atualizar skill ───────────────────────────────────────────────────────

  app.put("/api/skills/:id", async (req: Request, res: Response) => {
    try {
      const [existing] = await db
        .select()
        .from(arcadiaSkills)
        .where(eq(arcadiaSkills.id, req.params.id))
        .limit(1);

      if (!existing) return res.status(404).json({ error: "Skill não encontrada" });

      const [updated] = await db
        .update(arcadiaSkills)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(arcadiaSkills.id, req.params.id))
        .returning();

      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ── Deletar skill ─────────────────────────────────────────────────────────

  app.delete("/api/skills/:id", async (req: Request, res: Response) => {
    try {
      const result = await db
        .delete(arcadiaSkills)
        .where(eq(arcadiaSkills.id, req.params.id));

      if ((result.rowCount ?? 0) === 0) {
        return res.status(404).json({ error: "Skill não encontrada" });
      }
      res.json({ deleted: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ── Executar skill ────────────────────────────────────────────────────────

  app.post("/api/skills/:id/execute", async (req: Request, res: Response) => {
    try {
      const body = executeBodySchema.parse(req.body);

      const result = await skillEngine.execute({
        skillId: req.params.id,
        inputParams: body.inputParams,
        context: {
          tenantId: tenantId(req),
          userId: userId(req),
        },
        triggeredBy: body.triggeredBy,
        automationId: body.automationId,
        parentExecutionId: body.parentExecutionId,
      });

      const statusCode = result.status === "success" ? 200 : 500;
      res.status(statusCode).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ── Histórico de execuções ────────────────────────────────────────────────

  app.get("/api/skills/:id/executions", async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const executions = await skillEngine.getExecutions(req.params.id, limit);
      res.json({ executions });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ── Marketplace: listar skills do sistema disponíveis ────────────────────

  app.get("/api/skills/marketplace", async (req: Request, res: Response) => {
    try {
      const search = req.query.search as string | undefined;
      const tag = req.query.tag as string | undefined;
      const tid = tenantId(req);

      const conditions: any[] = [
        eq(arcadiaSkills.namespace, "system"),
        eq(arcadiaSkills.status, "active"),
      ];

      if (search) {
        conditions.push(
          or(
            ilike(arcadiaSkills.name, `%${search}%`),
            ilike(arcadiaSkills.description, `%${search}%`),
            ilike(arcadiaSkills.slug, `%${search}%`)
          )
        );
      }

      const skills = await db
        .select()
        .from(arcadiaSkills)
        .where(and(...conditions))
        .orderBy(desc(arcadiaSkills.createdAt))
        .limit(100);

      // Marcar quais já foram importadas pelo tenant
      let importedSlugs: string[] = [];
      if (tid) {
        const tenantSkills = await db
          .select({ slug: arcadiaSkills.slug })
          .from(arcadiaSkills)
          .where(and(eq(arcadiaSkills.tenantId, tid), ne(arcadiaSkills.namespace, "system")));
        importedSlugs = tenantSkills.map(s => s.slug);
      }

      const result = skills
        .filter(s => !tag || (s.tags ?? []).includes(tag))
        .map(s => ({ ...s, imported: importedSlugs.includes(s.slug) }));

      res.json({ skills: result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ── Marketplace: importar skill do sistema para o tenant ──────────────────

  app.post("/api/skills/marketplace/:id/import", async (req: Request, res: Response) => {
    try {
      const tid = tenantId(req);
      const uid = userId(req);

      const [source] = await db
        .select()
        .from(arcadiaSkills)
        .where(and(eq(arcadiaSkills.id, req.params.id), eq(arcadiaSkills.namespace, "system")))
        .limit(1);

      if (!source) return res.status(404).json({ error: "Skill não encontrada no marketplace" });

      // Clonar para o namespace tenant
      const [imported] = await db
        .insert(arcadiaSkills)
        .values({
          name: source.name,
          slug: source.slug,
          description: source.description,
          version: source.version,
          icon: source.icon,
          tags: source.tags,
          namespace: "tenant",
          tenantId: tid,
          extends: [`/skill:system/${source.slug}`],
          body: source.body,
          parametersSchema: source.parametersSchema,
          returnSchema: source.returnSchema,
          triggerType: source.triggerType,
          triggerConfig: source.triggerConfig,
          status: "draft",
          createdBy: uid,
        } as any)
        .returning();

      res.status(201).json({ skill: imported, importedFrom: source.id });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ── Execução por ID ───────────────────────────────────────────────────────

  app.get("/api/skills/executions/:executionId", async (req: Request, res: Response) => {
    try {
      const [execution] = await db
        .select()
        .from(skillExecutions)
        .where(eq(skillExecutions.id, req.params.executionId))
        .limit(1);

      if (!execution) return res.status(404).json({ error: "Execução não encontrada" });
      res.json(execution);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ── Versionamento: listar versões ──────────────────────────────────────────

  app.get("/api/skills/:id/versions", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const versions = await versionManager.listVersions(id, limit, offset);
      res.json({ versions });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ── Versionamento: criar versão ────────────────────────────────────────────

  app.post("/api/skills/:id/versions", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { message } = req.body;
      const uid = userId(req);

      if (!message) {
        return res.status(400).json({ error: "message required" });
      }

      const skill = await db
        .select()
        .from(arcadiaSkills)
        .where(eq(arcadiaSkills.id, id))
        .executeTakeFirst();

      if (!skill) {
        return res.status(404).json({ error: "Skill not found" });
      }

      const version = await versionManager.createVersion(
        id,
        message,
        uid || "system",
        skill.content
      );

      res.json({ version });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ── Versionamento: rollback ────────────────────────────────────────────────

  app.post("/api/skills/:id/rollback", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { sha } = req.body;
      const uid = userId(req);

      if (!sha) {
        return res.status(400).json({ error: "sha required" });
      }

      const skill = await versionManager.rollbackToVersion(id, sha, uid || "system");
      res.json({ skill, message: `Rolled back to ${sha.slice(0, 7)}` });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ── Versionamento: fork ────────────────────────────────────────────────────

  app.post("/api/skills/:id/fork", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { newSlug } = req.body;
      const uid = userId(req);

      if (!newSlug) {
        return res.status(400).json({ error: "newSlug required" });
      }

      const skill = await versionManager.fork(id, newSlug, uid || "system");
      res.json({ skill, message: `Forked to ${newSlug}` });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ── Versionamento: diff ────────────────────────────────────────────────────

  app.get("/api/skills/:id/diff", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { from, to } = req.query;

      if (!from || !to) {
        return res.status(400).json({ error: "from and to shas required" });
      }

      const diff = await versionManager.diffVersions(
        id,
        from as string,
        to as string
      );

      res.json({ diff });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });
}
