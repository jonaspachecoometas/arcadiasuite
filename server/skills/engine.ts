// server/skills/engine.ts
// Motor de execução de skills — herança, composição, polimorfismo

import { db } from "../../db";
import { skills, skillExecutions } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import type { Skill, InsertSkillExecution } from "../../shared/schema";
import { referenceParser } from "./reference/parser";
import { referenceResolver, type ResolveContext } from "./reference/resolver";
import crypto from "crypto";

export interface ExecuteOptions {
  parameters?: Record<string, unknown>;
  triggeredBy?: InsertSkillExecution["triggeredBy"];
  triggeredByUserId?: string;
  triggeredByAgentId?: string;
  ctx: ResolveContext;
}

export interface ExecuteResult {
  success: boolean;
  data?: unknown;
  error?: string;
  durationMs: number;
  executionId: string;
}

export class SkillEngine {
  /** Executa uma skill pelo slug dentro de um tenant */
  async execute(slug: string, opts: ExecuteOptions): Promise<ExecuteResult> {
    const start = Date.now();

    // 1. Buscar a skill
    const skill = await this.findSkill(slug, opts.ctx);
    if (!skill) {
      return { success: false, error: `Skill não encontrada: ${slug}`, durationMs: 0, executionId: '' };
    }

    // 2. Criar registro de execução
    const [execution] = await db.insert(skillExecutions).values({
      skillId: skill.id,
      tenantId: opts.ctx.tenantId,
      triggeredBy: opts.triggeredBy ?? 'manual',
      triggeredByUserId: opts.triggeredByUserId,
      triggeredByAgentId: opts.triggeredByAgentId,
      parameters: opts.parameters ?? {},
      status: 'running',
    }).returning();

    try {
      // 3. Resolver dependências declaradas no corpo
      const resolvedDeps = await this.resolveDependencies(skill, opts.ctx);

      // 4. Montar contexto de execução final
      const execCtx: ResolveContext = {
        ...opts.ctx,
        variables: {
          ...(opts.ctx.variables ?? {}),
          parameters: opts.parameters ?? {},
          deps: resolvedDeps,
        },
      };

      // 5. Executar — por enquanto retorna o corpo interpolado com o contexto
      const result = await this.runBody(skill, execCtx);

      const durationMs = Date.now() - start;
      const auditHash = crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex');

      await db.update(skillExecutions)
        .set({ status: 'success', result, durationMs, completedAt: new Date(), auditHash })
        .where(eq(skillExecutions.id, execution.id));

      return { success: true, data: result, durationMs, executionId: execution.id };
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      const durationMs = Date.now() - start;

      await db.update(skillExecutions)
        .set({ status: 'failed', error, durationMs, completedAt: new Date() })
        .where(eq(skillExecutions.id, execution.id));

      return { success: false, error, durationMs, executionId: execution.id };
    }
  }

  /** Resolve a cadeia de herança e retorna skill + ancestors mesclados */
  async resolveInheritance(skill: Skill): Promise<Skill[]> {
    const chain: Skill[] = [skill];
    for (const parentRef of (skill.extends ?? [])) {
      const slug = parentRef.replace(/^\/skill(:\w+)?\//, '');
      const parent = await db.select().from(skills)
        .where(eq(skills.slug, slug)).limit(1);
      if (parent[0]) chain.push(parent[0]);
    }
    return chain;
  }

  private async findSkill(slug: string, ctx: ResolveContext): Promise<Skill | null> {
    const conditions = [eq(skills.slug, slug), eq(skills.status, 'active')];
    if (ctx.tenantId) conditions.push(eq(skills.tenantId, ctx.tenantId));
    const [skill] = await db.select().from(skills).where(and(...conditions)).limit(1);
    return skill ?? null;
  }

  private async resolveDependencies(skill: Skill, ctx: ResolveContext): Promise<Record<string, unknown>> {
    if (!skill.body) return {};
    const refs = referenceParser.parse(skill.body);
    const resolved: Record<string, unknown> = {};
    for (const ref of refs) {
      const key = ref.fullMatch.replace(/\//g, '_').replace(/[^a-z0-9_]/gi, '');
      resolved[key] = await referenceResolver.resolve(ref, ctx);
    }
    return resolved;
  }

  private async runBody(skill: Skill, ctx: ResolveContext): Promise<unknown> {
    // Fase 2: aqui o body Markdown será interpretado passo a passo pelo Manus/LLM
    // Por ora retorna o body com variáveis simples substituídas
    if (!skill.body) return null;
    let output = skill.body;

    // Substituir {{parameters.x}} e {{/var/x}}
    const vars = (ctx.variables ?? {}) as Record<string, unknown>;
    const params = (vars.parameters ?? {}) as Record<string, unknown>;
    output = output.replace(/\{\{parameters\.([^}]+)\}\}/g, (_, k) => String(params[k] ?? ''));
    output = output.replace(/\{\{\/var\/([^}]+)\}\}/g, (_, path) => {
      const parts = path.split('.');
      let v: unknown = vars;
      for (const p of parts) v = (v as Record<string, unknown>)?.[p];
      return String(v ?? '');
    });

    return { rendered: output, resolvedAt: new Date().toISOString() };
  }
}

export const skillEngine = new SkillEngine();
