import { BaseTool, ToolDefinition, ToolResult } from "./BaseTool";
import { governanceService } from "../../governance/service";
import { db } from "../../../db/index";
import { xosToolRegistry } from "@shared/schema";
import { eq } from "drizzle-orm";

export class ToolManager {
  private tools: Map<string, BaseTool> = new Map();
  private categories: Map<string, string[]> = new Map();
  private governanceSynced: boolean = false;

  register(tool: BaseTool): void {
    this.tools.set(tool.name, tool);

    const categoryTools = this.categories.get(tool.category) || [];
    categoryTools.push(tool.name);
    this.categories.set(tool.category, categoryTools);

    console.log(`[ToolManager] Ferramenta registrada: ${tool.name} (${tool.category})`);
  }

  async syncWithGovernance(): Promise<void> {
    if (this.governanceSynced) return;
    try {
      const toolDefs = this.listTools().map(t => ({
        name: t.name,
        description: t.description,
        category: t.name.split('.')[0] || 'general',
      }));
      await governanceService.syncToolsFromManager(toolDefs);
      this.governanceSynced = true;
    } catch (error) {
      console.error("[ToolManager] Erro ao sincronizar com governança:", error);
    }
  }

  unregister(toolName: string): boolean {
    const tool = this.tools.get(toolName);
    if (!tool) return false;

    this.tools.delete(toolName);

    const categoryTools = this.categories.get(tool.category);
    if (categoryTools) {
      const index = categoryTools.indexOf(toolName);
      if (index > -1) {
        categoryTools.splice(index, 1);
      }
    }

    return true;
  }

  get(toolName: string): BaseTool | undefined {
    return this.tools.get(toolName);
  }

  private async checkRBAC(toolName: string, agentName: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const [toolRecord] = await db.select().from(xosToolRegistry)
        .where(eq(xosToolRegistry.name, toolName));

      if (!toolRecord) return { allowed: true };

      const allowedAgents = toolRecord.allowedAgents as string[] | null;
      if (!allowedAgents || allowedAgents.length === 0) return { allowed: true };

      if (allowedAgents.includes(agentName) || allowedAgents.includes("*")) {
        return { allowed: true };
      }

      return {
        allowed: false,
        reason: `Agente "${agentName}" não tem permissão para usar "${toolName}". Agentes permitidos: ${allowedAgents.join(", ")}`,
      };
    } catch {
      return { allowed: true };
    }
  }

  async execute(toolName: string, params: Record<string, any>, agentName?: string): Promise<ToolResult> {
    const tool = this.tools.get(toolName);

    if (!tool) {
      return {
        success: false,
        result: `Ferramenta não encontrada: ${toolName}`,
        error: `TOOL_NOT_FOUND: ${toolName}`,
      };
    }

    if (agentName) {
      const rbacCheck = await this.checkRBAC(toolName, agentName);
      if (!rbacCheck.allowed) {
        return {
          success: false,
          result: `RBAC: ${rbacCheck.reason}`,
          error: `RBAC_DENIED: ${toolName}`,
        };
      }

      const target = params.path || params.file || params.command || toolName;
      const policy = await governanceService.evaluatePolicy(agentName, toolName, target, params);
      if (!policy.allowed) {
        return {
          success: false,
          result: `Bloqueado pela governança: ${policy.reason}`,
          error: `GOVERNANCE_DENIED: ${policy.matchedPolicyName || 'unknown'}`,
        };
      }
    }

    const validation = tool.validateParams(params);
    if (!validation.valid) {
      return {
        success: false,
        result: validation.error || "Parâmetros inválidos",
        error: validation.error,
      };
    }

    try {
      const startTime = Date.now();
      const result = await tool.execute(params);
      const duration = Date.now() - startTime;

      console.log(`[ToolManager] ${toolName} executado em ${duration}ms`);

      if (agentName) {
        await governanceService.recordAudit({
          agentName,
          action: toolName,
          target: params.path || params.file || toolName,
          decision: result.success ? "executed" : "failed",
          justification: result.success ? `Executado com sucesso em ${duration}ms` : result.error,
          input: params,
          output: { success: result.success, duration },
        });
      }

      return result;
    } catch (error: any) {
      console.error(`[ToolManager] Erro ao executar ${toolName}:`, error);
      return {
        success: false,
        result: `Erro ao executar ferramenta: ${error.message}`,
        error: error.message,
      };
    }
  }

  listTools(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => tool.getDefinition());
  }

  listToolsByCategory(category: string): ToolDefinition[] {
    const toolNames = this.categories.get(category) || [];
    return toolNames
      .map((name) => this.tools.get(name)?.getDefinition())
      .filter((def): def is ToolDefinition => def !== undefined);
  }

  listCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  getToolsForPrompt(): string {
    const lines: string[] = [];
    lines.push("## Ferramentas Disponíveis\n");

    for (const category of this.listCategories()) {
      lines.push(`### ${category}\n`);
      
      const tools = this.listToolsByCategory(category);
      for (const tool of tools) {
        lines.push(`#### ${tool.name}`);
        lines.push(`${tool.description}\n`);
        lines.push("**Parâmetros:**");
        
        for (const param of tool.parameters) {
          const required = param.required ? "(obrigatório)" : "(opcional)";
          lines.push(`- \`${param.name}\` (${param.type}) ${required}: ${param.description}`);
        }
        lines.push("");
      }
    }

    return lines.join("\n");
  }

  getToolCount(): number {
    return this.tools.size;
  }
}

export const toolManager = new ToolManager();
