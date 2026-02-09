/**
 * Arcadia Suite - Base Blackboard Agent
 * 
 * Classe base para agentes que monitoram e reagem ao Blackboard.
 * 
 * @author Arcadia Development Team
 * @version 1.0.0
 */

import OpenAI from "openai";
import { blackboardService, type AgentName, type TaskStatus } from "./service";
import { type BlackboardTask, type BlackboardArtifact } from "@shared/schema";
import { EventEmitter } from "events";
import { governanceService } from "../governance/service";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface AgentConfig {
  name: AgentName;
  displayName: string;
  description: string;
  systemPrompt: string;
  capabilities: string[];
  pollInterval?: number;
}

export interface AgentThought {
  thought: string;
  action?: string;
  actionInput?: any;
  finished?: boolean;
  result?: any;
}

export abstract class BaseBlackboardAgent extends EventEmitter {
  protected config: AgentConfig;
  protected isRunning: boolean = false;
  protected pollTimer: NodeJS.Timeout | null = null;

  constructor(config: AgentConfig) {
    super();
    this.config = config;
  }

  get name(): AgentName {
    return this.config.name;
  }

  get displayName(): string {
    return this.config.displayName;
  }

  abstract canHandle(task: BlackboardTask): boolean;

  abstract process(task: BlackboardTask): Promise<void>;

  protected async think(
    task: BlackboardTask, 
    context: string,
    artifacts: BlackboardArtifact[] = []
  ): Promise<AgentThought> {
    const artifactContext = artifacts.length > 0
      ? `\n\nArtefatos disponíveis:\n${artifacts.map(a => `- ${a.name} (${a.type}): ${a.content?.slice(0, 500)}...`).join('\n')}`
      : '';

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: this.config.systemPrompt },
          { 
            role: "user", 
            content: `TAREFA: ${task.title}\n\nDESCRIÇÃO: ${task.description}\n\nCONTEXTO: ${context}${artifactContext}\n\nResponda em JSON: { "thought": "seu raciocínio", "action": "próxima ação", "actionInput": {}, "finished": true/false, "result": "se finished=true" }`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content) as AgentThought;
    } catch (error: any) {
      console.error(`[${this.name}] Erro ao pensar:`, error.message);
      return {
        thought: `Erro ao processar: ${error.message}`,
        finished: true,
        result: { error: error.message }
      };
    }
  }

  protected async generateWithAI(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt || this.config.systemPrompt },
          { role: "user", content: prompt }
        ],
        max_tokens: 8000,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error: any) {
      console.error(`[${this.name}] Erro na geração:`, error.message);
      throw error;
    }
  }

  protected async log(taskId: number, action: string, thought: string, observation?: string): Promise<void> {
    await blackboardService.logAction(taskId, this.name, action, thought, observation);
    console.log(`[${this.name}] ${action}: ${thought}`);

    await governanceService.recordAudit({
      agentName: this.name,
      action,
      target: thought.slice(0, 200),
      decision: "logged",
      justification: observation?.slice(0, 500),
      taskId,
    });
  }

  protected async checkPolicy(action: string, target: string, context?: any): Promise<boolean> {
    const evaluation = await governanceService.evaluatePolicy(this.name, action, target, context);
    if (!evaluation.allowed) {
      console.warn(`[${this.name}] Ação bloqueada pela governança: ${evaluation.reason}`);
    }
    return evaluation.allowed;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log(`[${this.name}] Agente iniciado`);
    
    this.poll();
  }

  private async poll(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const tasks = await blackboardService.getPendingTasksForAgent(this.name);
      
      for (const task of tasks) {
        if (this.canHandle(task)) {
          const claimed = await blackboardService.claimTask(task.id, this.name);
          
          if (claimed) {
            console.log(`[${this.name}] Processando tarefa: ${task.title}`);
            
            try {
              await this.process(task);
            } catch (error: any) {
              console.error(`[${this.name}] Erro ao processar tarefa:`, error.message);
              await blackboardService.failTask(task.id, this.name, error.message);
            }
          }
        }
      }
    } catch (error: any) {
      console.error(`[${this.name}] Erro no polling:`, error.message);
    }

    this.pollTimer = setTimeout(() => this.poll(), this.config.pollInterval || 2000);
  }

  stop(): void {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    console.log(`[${this.name}] Agente parado`);
  }

  getStatus(): { name: string; running: boolean; capabilities: string[] } {
    return {
      name: this.displayName,
      running: this.isRunning,
      capabilities: this.config.capabilities,
    };
  }
}
