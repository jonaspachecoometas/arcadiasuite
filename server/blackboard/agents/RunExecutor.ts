/**
 * Run Executor Agent
 * Executa agentes via Ollama (llama ou deepseek)
 */

import { BaseBlackboardAgent, type AgentConfig } from "../BaseBlackboardAgent";
import { blackboardService } from "../service";
import fetch from "node-fetch";

const SYSTEM_PROMPT = `Você é o RunExecutor do Arcadia.
Você recebe a spec de um agente e a executa via IA.

Processo:
1. Parsear spec (markdown, code ou json)
2. Preparar prompt para Ollama
3. Chamar modelo (deepseek-r1:14b)
4. Retornar resultado

Responda com JSON: { success: boolean, output: string, error?: string }`;

export class RunExecutor extends BaseBlackboardAgent {
  constructor() {
    const config: AgentConfig = {
      name: "run-executor",
      displayName: "Run Executor",
      description: "Executa agentes via Ollama",
      systemPrompt: SYSTEM_PROMPT,
      capabilities: ["Executar specs", "Chamar Ollama", "Retornar output"],
      maxRetries: 1,
      timeout: 120000,
    };

    super(config);
  }

  async processSubtask(subtaskId: number, context: any): Promise<void> {
    try {
      const subtask = await this.getSubtask(subtaskId);
      if (!subtask) throw new Error("Subtask não encontrada");

      const spec = context?.agentDefId
        ? await this.getAgentSpec(context.agentDefId)
        : subtask.description;

      // Executar via Ollama
      const result = await this.runViaOllama(spec);

      // Salvar como artefato
      await blackboardService.createArtifact(
        subtask.taskId,
        "execution-result",
        result,
        "Agent execution result"
      );

      // Marcar subtask como completo
      await this.updateSubtaskStatus(subtaskId, "completed");
    } catch (error: any) {
      await this.updateSubtaskStatus(subtaskId, "error");
      throw error;
    }
  }

  private async runViaOllama(spec: string): Promise<string> {
    try {
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "deepseek-r1:14b",
          prompt: `Execute este agente:\n\n${spec}`,
          stream: false,
        }),
      });

      if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
      const data = (await response.json()) as any;
      return data.response || "Sem output";
    } catch (error: any) {
      return `ERRO ao executar: ${error.message}`;
    }
  }

  private async getAgentSpec(agentDefId: number): Promise<string> {
    // Implementado em BaseBlackboardAgent ou aqui
    return `Agent ID: ${agentDefId}`;
  }

  private async getSubtask(subtaskId: number): Promise<any> {
    // Query no banco
    return null;
  }

  private async updateSubtaskStatus(subtaskId: number, status: string): Promise<void> {
    // Update no banco
  }
}

export const runExecutor = new RunExecutor();
