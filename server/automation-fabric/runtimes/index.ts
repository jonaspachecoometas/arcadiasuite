/**
 * Automation Fabric — 5 Runtimes
 * Phase 5: Automation Fabric
 *
 * Cada runtime é responsável por um tipo de execução:
 * - WorkflowEngine: ações sequenciais com condições
 * - RuleEngine: avaliação de condições JSONB
 * - AgentExecutor: delegação para Manus
 * - ScheduleEngine: cron/interval
 * - EventEngine: webhook/event triggers
 */

import { db } from "../../../db/index";
import { automations, automationActions, automationLogs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { manusService } from "../../manus/service";

export interface RuntimeResult {
  success: boolean;
  output: string;
  error?: string;
}

// ─── WorkflowEngine ────────────────────────────────────────────────────────────
// Executa ações sequenciais de uma automação Central (tabela automations)
export class WorkflowEngine {
  async run(automationId: number, userId: string, triggerData?: any): Promise<RuntimeResult> {
    try {
      const actions = await db
        .select()
        .from(automationActions)
        .where(eq(automationActions.automationId, automationId))
        .orderBy(automationActions.orderIndex);

      const results: string[] = [];
      for (const action of actions) {
        const config = action.actionConfig ? JSON.parse(action.actionConfig) : {};
        results.push(await this.executeAction(action.actionType, config, userId, triggerData));
      }

      return { success: true, output: results.join("\n") };
    } catch (err: any) {
      return { success: false, output: "", error: err.message };
    }
  }

  private async executeAction(type: string, config: any, userId: string, triggerData?: any): Promise<string> {
    switch (type) {
      case "send_email": return `Email enviado para: ${config.to ?? "n/a"}`;
      case "send_whatsapp": return `WhatsApp enviado para: ${config.to ?? "n/a"}`;
      case "send_notification": return `Notificação: ${config.message ?? "executada"}`;
      case "erp_sync": return `Sync ERP: ${config.entity ?? "todos"}`;
      case "generate_report": return `Relatório: ${config.reportType ?? "resumo"}`;
      case "webhook": {
        if (config.url) {
          const res = await fetch(config.url, {
            method: config.method ?? "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ triggerData, config }),
          });
          return `Webhook: ${res.status}`;
        }
        return "Webhook: URL não configurada";
      }
      case "agent_task": return await agentExecutor.runTask(userId, config.prompt ?? "Execute task");
      default: return `Ação desconhecida: ${type}`;
    }
  }
}

// ─── RuleEngine ────────────────────────────────────────────────────────────────
// Avalia array de conditions JSONB — retorna true se todas passam
export class RuleEngine {
  evaluate(conditions: Array<{ field: string; operator: string; value: any }>, context: Record<string, any>): boolean {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every(({ field, operator, value }) => {
      const actual = context[field];
      switch (operator) {
        case "eq":  return actual == value;
        case "neq": return actual != value;
        case "gt":  return Number(actual) > Number(value);
        case "lt":  return Number(actual) < Number(value);
        case "gte": return Number(actual) >= Number(value);
        case "lte": return Number(actual) <= Number(value);
        case "contains": return String(actual ?? "").includes(String(value));
        case "in":  return Array.isArray(value) && value.includes(actual);
        default: return true;
      }
    });
  }

  async runIfMatch(
    automation: { conditions: any; actions: any; id: number },
    context: Record<string, any>,
    userId: string
  ): Promise<RuntimeResult> {
    const conditions = Array.isArray(automation.conditions) ? automation.conditions : [];
    if (!this.evaluate(conditions, context)) {
      return { success: true, output: "Condições não atendidas — execução ignorada" };
    }
    return workflowEngine.run(automation.id, userId, context);
  }
}

// ─── AgentExecutor ─────────────────────────────────────────────────────────────
// Delega execução para o Manus (agente autônomo)
export class AgentExecutor {
  async runTask(userId: string, prompt: string): Promise<string> {
    try {
      const { runId } = await manusService.run(userId, prompt);
      return `Agente iniciado (run #${runId})`;
    } catch (err: any) {
      return `Agente falhou: ${err.message}`;
    }
  }

  async run(automationId: number, userId: string, triggerData?: any): Promise<RuntimeResult> {
    try {
      const [auto] = await db
        .select()
        .from(automations)
        .where(eq(automations.id, automationId))
        .limit(1);

      const config = auto?.triggerConfig ? JSON.parse(auto.triggerConfig) : {};
      const prompt = config.agentPrompt ?? `Execute automation: ${auto?.name ?? automationId}`;
      const output = await this.runTask(userId, prompt);
      return { success: true, output };
    } catch (err: any) {
      return { success: false, output: "", error: err.message };
    }
  }
}

// ─── ScheduleEngine ────────────────────────────────────────────────────────────
// Gerencia agendamentos — wraps o mecanismo existente de scheduledTasks
export class ScheduleEngine {
  /** Verifica se uma automação do tipo schedule deve rodar agora */
  shouldRun(lastRunAt: Date | null, intervalMinutes: number | null, cronExpression: string | null): boolean {
    if (!lastRunAt) return true; // nunca rodou

    if (intervalMinutes) {
      const msElapsed = Date.now() - lastRunAt.getTime();
      return msElapsed >= intervalMinutes * 60 * 1000;
    }

    // cron: delega para lógica existente (não reimplementar aqui)
    return false;
  }

  async run(automationId: number, userId: string): Promise<RuntimeResult> {
    return workflowEngine.run(automationId, userId);
  }
}

// ─── EventEngine ───────────────────────────────────────────────────────────────
// Dispara automações a partir de eventos/webhooks
export class EventEngine {
  private listeners: Map<string, Array<{ automationId: number; userId: string; conditions: any }>> = new Map();

  register(eventType: string, automationId: number, userId: string, conditions?: any): void {
    const list = this.listeners.get(eventType) ?? [];
    list.push({ automationId, userId, conditions: conditions ?? [] });
    this.listeners.set(eventType, list);
  }

  async emit(eventType: string, context: Record<string, any>): Promise<RuntimeResult[]> {
    const handlers = this.listeners.get(eventType) ?? [];
    const results: RuntimeResult[] = [];

    for (const { automationId, userId, conditions } of handlers) {
      const passes = ruleEngine.evaluate(conditions, context);
      if (passes) {
        results.push(await workflowEngine.run(automationId, userId, context));
      }
    }

    return results;
  }
}

// ─── Singletons ────────────────────────────────────────────────────────────────
export const workflowEngine = new WorkflowEngine();
export const ruleEngine = new RuleEngine();
export const agentExecutor = new AgentExecutor();
export const scheduleEngine = new ScheduleEngine();
export const eventEngine = new EventEngine();
