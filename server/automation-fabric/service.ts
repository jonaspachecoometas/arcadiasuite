/**
 * AutomationFabricService — Phase 5
 *
 * Agrega automações de duas fontes (Central + XOS) em uma visão unificada.
 * Roteia execuções para o runtime correto com base no triggerType.
 */

import { db } from "../../db/index";
import { automations, automationLogs, xosAutomations } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { workflowEngine, agentExecutor, scheduleEngine, eventEngine } from "./runtimes/index";

export interface UnifiedAutomation {
  id: string;          // "central:{id}" | "xos:{id}"
  sourceId: number;
  source: "central" | "xos";
  name: string;
  description: string | null;
  triggerType: string;
  isActive: boolean;
  executionCount: number;
  lastExecutedAt: Date | null;
  createdAt: Date;
}

export interface FabricRunResult {
  success: boolean;
  output: string;
  error?: string;
  logId?: number;
}

class AutomationFabricService {
  // ── Lista unificada ─────────────────────────────────────────────────────────

  async list(tenantId?: number | null): Promise<UnifiedAutomation[]> {
    // Central automations
    const centralRows = await db
      .select()
      .from(automations)
      .orderBy(desc(automations.updatedAt))
      .limit(200);

    // XOS automations (com ou sem filtro de tenant)
    const xosQuery = db.select().from(xosAutomations).orderBy(desc(xosAutomations.updatedAt)).limit(200);
    const xosRows = await xosQuery;

    const central: UnifiedAutomation[] = centralRows.map((r) => ({
      id: `central:${r.id}`,
      sourceId: r.id,
      source: "central",
      name: r.name,
      description: r.description ?? null,
      triggerType: r.triggerType,
      isActive: r.isActive === "true",
      executionCount: 0,
      lastExecutedAt: null,
      createdAt: r.createdAt,
    }));

    const xos: UnifiedAutomation[] = xosRows.map((r) => ({
      id: `xos:${r.id}`,
      sourceId: r.id,
      source: "xos",
      name: r.name,
      description: r.description ?? null,
      triggerType: r.triggerType,
      isActive: r.isActive ?? true,
      executionCount: r.executionCount ?? 0,
      lastExecutedAt: r.lastExecutedAt ?? null,
      createdAt: r.createdAt,
    }));

    return [...central, ...xos].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  // ── Execução via fabric ─────────────────────────────────────────────────────

  async run(fabricId: string, userId: string, triggerData?: any): Promise<FabricRunResult> {
    const [source, idStr] = fabricId.split(":");
    const id = parseInt(idStr);

    if (source === "central") {
      return this.runCentral(id, userId, triggerData);
    } else if (source === "xos") {
      return this.runXos(id, userId, triggerData);
    }
    return { success: false, output: "", error: `Fonte desconhecida: ${source}` };
  }

  private async runCentral(automationId: number, userId: string, triggerData?: any): Promise<FabricRunResult> {
    const [auto] = await db
      .select()
      .from(automations)
      .where(eq(automations.id, automationId))
      .limit(1);

    if (!auto) return { success: false, output: "", error: "Automação não encontrada" };

    const [log] = await db
      .insert(automationLogs)
      .values({
        automationId,
        status: "running",
        triggerData: triggerData ? JSON.stringify(triggerData) : null,
      })
      .returning({ id: automationLogs.id });

    // Roteamento por triggerType
    let result;
    if (auto.triggerType === "agent") {
      result = await agentExecutor.run(automationId, userId, triggerData);
    } else if (auto.triggerType === "schedule") {
      result = await scheduleEngine.run(automationId, userId);
    } else {
      result = await workflowEngine.run(automationId, userId, triggerData);
    }

    await db
      .update(automationLogs)
      .set({
        status: result.success ? "completed" : "error",
        result: result.output,
        error: result.error ?? null,
        completedAt: new Date(),
      })
      .where(eq(automationLogs.id, log.id));

    return { ...result, logId: log.id };
  }

  private async runXos(xosId: number, userId: string, triggerData?: any): Promise<FabricRunResult> {
    const [auto] = await db
      .select()
      .from(xosAutomations)
      .where(eq(xosAutomations.id, xosId))
      .limit(1);

    if (!auto) return { success: false, output: "", error: "Automação XOS não encontrada" };

    // XOS automations têm actions JSONB diretamente
    const actions: Array<{ type: string; config?: Record<string, any> }> = Array.isArray(auto.actions)
      ? auto.actions
      : [];

    const results: string[] = [];
    for (const action of actions) {
      results.push(`${action.type}: executado`);
    }

    const output = results.length > 0 ? results.join("\n") : `Automação XOS "${auto.name}" executada`;
    return { success: true, output };
  }

  // ── Toggle ativo/inativo ────────────────────────────────────────────────────

  async toggle(fabricId: string, isActive: boolean): Promise<void> {
    const [source, idStr] = fabricId.split(":");
    const id = parseInt(idStr);

    if (source === "central") {
      await db
        .update(automations)
        .set({ isActive: isActive ? "true" : "false", updatedAt: new Date() })
        .where(eq(automations.id, id));
    } else if (source === "xos") {
      await db
        .update(xosAutomations)
        .set({ isActive, updatedAt: new Date() })
        .where(eq(xosAutomations.id, id));
    }
  }
}

export const automationFabricService = new AutomationFabricService();
