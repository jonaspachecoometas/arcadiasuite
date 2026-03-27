// server/modules/skill-fabric/src/core/executor/SkillExecutor.ts
// Executes skills — dispatches to Sandbox (code) or template renderer (markdown)

import { db } from "../../../../../../db";
import { skills, skillExecutions } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { sandbox } from "./Sandbox";
import type { FabricExecuteOptions, FabricExecuteResult } from "../../types";

export class SkillExecutor {
  async execute(opts: FabricExecuteOptions): Promise<FabricExecuteResult> {
    const start = Date.now();

    // 1. Load skill
    const conditions = [eq(skills.id, opts.skillId)];
    if (opts.tenantId) conditions.push(eq(skills.tenantId, opts.tenantId));

    const [skill] = await db.select().from(skills).where(and(...conditions)).limit(1);
    if (!skill) {
      return { ok: false, error: `Skill não encontrada: ${opts.skillId}`, durationMs: 0, executionId: "" };
    }

    if (skill.status !== "active") {
      return { ok: false, error: `Skill está ${skill.status} — somente skills ativas podem ser executadas`, durationMs: 0, executionId: "" };
    }

    // 2. Create execution record
    const [execution] = await db.insert(skillExecutions).values({
      skillId: skill.id,
      tenantId: opts.tenantId ?? null,
      triggeredBy: "manual",
      triggeredByUserId: opts.userId ?? null,
      parameters: opts.parameters ?? {},
      status: "running",
    }).returning();

    const logs: string[] = [];

    try {
      let result: unknown;

      const body = skill.body ?? "";
      const isCodeSkill = body.trimStart().startsWith("//code");

      if (isCodeSkill) {
        // Strip the //code marker before executing
        const code = body.replace(/^\/\/code\s*\n?/, "");
        const sandboxResult = await sandbox.runAsync({
          code,
          context: {
            parameters: opts.parameters ?? {},
            skillId: skill.id,
            skillSlug: skill.slug,
          },
          timeout: opts.timeout ?? 5000,
        });

        logs.push(...sandboxResult.logs);

        if (!sandboxResult.ok) {
          throw new Error(sandboxResult.error ?? "Erro de execução no sandbox");
        }
        result = sandboxResult.value;
      } else {
        // Markdown skill — interpolate template variables
        result = this.renderMarkdown(body, opts.parameters ?? {});
      }

      const durationMs = Date.now() - start;
      const auditHash = crypto.createHash("sha256").update(JSON.stringify(result)).digest("hex");

      await db.update(skillExecutions)
        .set({ status: "success", result: result as Record<string, unknown>, durationMs, completedAt: new Date(), auditHash })
        .where(eq(skillExecutions.id, execution.id));

      return { ok: true, data: result, durationMs, executionId: execution.id, logs };
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      const durationMs = Date.now() - start;

      await db.update(skillExecutions)
        .set({ status: "failed", error, durationMs, completedAt: new Date() })
        .where(eq(skillExecutions.id, execution.id));

      return { ok: false, error, durationMs, executionId: execution.id, logs };
    }
  }

  private renderMarkdown(body: string, parameters: Record<string, unknown>): unknown {
    let output = body;

    // Substitute {{parameters.x}}
    output = output.replace(/\{\{parameters\.([^}]+)\}\}/g, (_, k: string) => {
      const val = (parameters as Record<string, unknown>)[k];
      return val !== undefined ? String(val) : "";
    });

    // Substitute {{varName}} — simple top-level vars from parameters
    output = output.replace(/\{\{(\w+)\}\}/g, (_, k: string) => {
      const val = (parameters as Record<string, unknown>)[k];
      return val !== undefined ? String(val) : `{{${k}}}`;
    });

    return { rendered: output, renderedAt: new Date().toISOString() };
  }
}

export const skillExecutor = new SkillExecutor();
