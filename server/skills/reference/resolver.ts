// server/skills/reference/resolver.ts
// Resolve referências /tipo/caminho para seus valores reais em tempo de execução

import { db } from "../../../db";
import { skills } from "../../../shared/schema";
import { eq, and } from "drizzle-orm";
import type { Reference } from "./parser";

export interface ResolveContext {
  tenantId?: number;
  companyId?: number;
  userId?: string;
  variables?: Record<string, unknown>;
  lastResult?: unknown;
}

export class ReferenceResolver {
  async resolve(ref: Reference, ctx: ResolveContext): Promise<unknown> {
    switch (ref.type) {
      case 'skill':
        return this.resolveSkill(ref, ctx);
      case 'var':
        return this.resolveVar(ref, ctx);
      case 'data':
        return this.resolveData(ref, ctx);
      default:
        // kg, file, tool, agent — implementados nas fases seguintes
        return `[${ref.type}:${ref.path}]`;
    }
  }

  private async resolveSkill(ref: Reference, ctx: ResolveContext) {
    const ns = ref.namespace ?? 'tenant';
    const conditions = [
      eq(skills.slug, ref.path),
      eq(skills.namespace, ns),
    ];
    if (ns === 'tenant' && ctx.tenantId) {
      conditions.push(eq(skills.tenantId, ctx.tenantId));
    }
    const [skill] = await db.select().from(skills).where(and(...conditions)).limit(1);
    return skill ?? null;
  }

  private resolveVar(ref: Reference, ctx: ResolveContext): unknown {
    if (!ctx.variables) return null;
    // Suporta /var/usuario.nome via notação pontilhada
    const parts = ref.path.split('.');
    let val: unknown = ctx.variables;
    for (const part of parts) {
      if (val == null || typeof val !== 'object') return null;
      val = (val as Record<string, unknown>)[part];
    }
    return val;
  }

  private resolveData(ref: Reference, ctx: ResolveContext): unknown {
    // Placeholder — integração com queries dinâmicas na Fase 2
    return `[data:${ref.path}]`;
  }
}

export const referenceResolver = new ReferenceResolver();
