/**
 * OpenClawEngine.ts
 *
 * Orquestração central de OpenClaw
 * Coordena detecção de padrões, geração de skills e sugestões
 *
 * Fase 4: OpenClaw Embutido
 */

import { PatternDetector, getPatternDetector, DetectedPattern } from "./PatternDetector";
import { SkillEmergence } from "./SkillEmergence";
import { EventEmitter } from "events";
import { Server as SocketIOServer } from "socket.io";

interface SkillSuggestion {
  id: string;
  pattern: DetectedPattern;
  suggested_skill_name: string;
  suggested_description: string;
  estimated_automation: string;
  confidence: number;
  created_at: Date;
  status: "pending" | "accepted" | "rejected";
}

interface OpenClawEngineConfig {
  pattern_detection: {
    enabled: boolean;
    min_occurrences: number;
    time_window_days: number;
    confidence_threshold: number;
    scheduled_check_interval_minutes: number;
  };
  suggestions: {
    enabled: boolean;
    auto_suggest: boolean;
    channels: string[];
    priority_threshold: number;
  };
  emergence: {
    create_as_draft: boolean;
    auto_publish: boolean;
    notify_admins: boolean;
    skill_prefix: string;
  };
  logging: {
    enabled: boolean;
    store_patterns: boolean;
    store_in_kg: boolean;
    audit_trail: boolean;
  };
}

/**
 * OpenClawEngine
 *
 * Motor central que coordena todo o fluxo de OpenClaw:
 * Pattern Detection → Suggestions → Skill Generation → Dev Center
 */
export class OpenClawEngine extends EventEmitter {
  private patternDetector: PatternDetector;
  private skillEmergence: SkillEmergence;
  private config: OpenClawEngineConfig;
  private socketIO?: SocketIOServer;
  private checkInterval?: NodeJS.Timer;
  private suggestions: Map<string, SkillSuggestion> = new Map();

  constructor(config: Partial<OpenClawEngineConfig>, socketIO?: SocketIOServer) {
    super();

    // Configuração padrão
    this.config = {
      pattern_detection: {
        enabled: true,
        min_occurrences: 3,
        time_window_days: 30,
        confidence_threshold: 0.8,
        scheduled_check_interval_minutes: 60,
        ...config?.pattern_detection,
      },
      suggestions: {
        enabled: true,
        auto_suggest: false,
        channels: ["widget", "chat"],
        priority_threshold: 0.85,
        ...config?.suggestions,
      },
      emergence: {
        create_as_draft: true,
        auto_publish: false,
        notify_admins: true,
        skill_prefix: "emergent_",
        ...config?.emergence,
      },
      logging: {
        enabled: true,
        store_patterns: true,
        store_in_kg: true,
        audit_trail: true,
        ...config?.logging,
      },
    };

    this.socketIO = socketIO;
    this.patternDetector = getPatternDetector(this.config.pattern_detection);
    this.skillEmergence = new SkillEmergence();

    // Setup listeners
    this.setupListeners();

    console.log("[OpenClawEngine] Inicializado com config:", this.config);
  }

  /**
   * Setup dos listeners de eventos internos
   */
  private setupListeners(): void {
    // Listener: quando PatternDetector detecta um padrão
    this.patternDetector.on("pattern-detected", async (event) => {
      console.log("[OpenClawEngine] Padrão detectado:", event.pattern);
      await this.handlePatternDetected(event.pattern);
    });

    // Listener: quando usuário confirma uma sugestão
    this.on("user-confirmed-suggestion", async (suggestionId: string) => {
      console.log("[OpenClawEngine] Usuário confirmou sugestão:", suggestionId);
      await this.handleUserConfirmation(suggestionId);
    });
  }

  /**
   * Detectar padrão manualmente
   *
   * Pode ser chamado por:
   * 1. Sistema ao receber uma interação
   * 2. Scheduler verificando regularmente
   * 3. API endpoint de teste
   */
  async detectPattern(userId: string, tenantId: string, actionType: string): Promise<DetectedPattern | null> {
    if (!this.config.pattern_detection.enabled) {
      return null;
    }

    const pattern = await this.patternDetector.detectPattern(userId, tenantId, actionType);

    if (pattern && pattern.confidence >= this.config.suggestions.priority_threshold) {
      // Padrão de alta prioridade - sugerir imediatamente
      await this.suggestSkill(pattern);
    }

    return pattern;
  }

  /**
   * Handler: Padrão foi detectado
   *
   * Fluxo:
   * 1. Validar padrão
   * 2. Gerar sugestão de skill
   * 3. Emitir para widget via Socket.IO
   * 4. Armazenar sugestão
   */
  private async handlePatternDetected(pattern: DetectedPattern): Promise<void> {
    try {
      console.log(`[OpenClawEngine] Processando padrão detectado: ${pattern.action_type}`);

      // 1. Gerar sugestão de skill baseado no padrão
      const suggestion = await this.suggestSkill(pattern);

      if (!suggestion) {
        console.log("[OpenClawEngine] Não foi possível gerar sugestão para o padrão");
        return;
      }

      // 2. Emitir evento para Socket.IO (chega no widget frontend)
      if (this.socketIO) {
        this.socketIO.emit("openclaw:pattern-detected", {
          suggestion,
          timestamp: new Date(),
        });

        console.log("[OpenClawEngine] Evento emitido ao Socket.IO");
      }

      // 3. Armazenar sugestão
      this.suggestions.set(suggestion.id, suggestion);

      // 4. Notificar admin se configurado
      if (this.config.emergence.notify_admins) {
        await this.notifyAdmins(pattern, suggestion);
      }
    } catch (error) {
      console.error("[OpenClawEngine] Erro ao processar padrão detectado:", error);
      this.emit("error", error);
    }
  }

  /**
   * Gerar sugestão de skill baseado em um padrão
   *
   * Analisa o padrão e cria uma sugestão descritiva
   * do que a automação faria
   */
  private async suggestSkill(pattern: DetectedPattern): Promise<SkillSuggestion | null> {
    try {
      // Gerar nome e descrição da skill baseado no padrão
      const skillName = this.generateSkillName(pattern);
      const skillDescription = this.generateSkillDescription(pattern);
      const estimatedAutomation = this.generateAutomationPreview(pattern);

      const suggestion: SkillSuggestion = {
        id: `suggest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        pattern,
        suggested_skill_name: skillName,
        suggested_description: skillDescription,
        estimated_automation: estimatedAutomation,
        confidence: pattern.confidence,
        created_at: new Date(),
        status: "pending",
      };

      console.log(`[OpenClawEngine] Sugestão gerada: ${skillName}`);

      return suggestion;
    } catch (error) {
      console.error("[OpenClawEngine] Erro ao gerar sugestão:", error);
      return null;
    }
  }

  /**
   * Gerar nome da skill baseado no padrão
   */
  private generateSkillName(pattern: DetectedPattern): string {
    // Simples: capitalizar o tipo de ação
    // Exemplo: "query_sales_report" → "Sales Report Query"

    const words = pattern.action_type.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1));
    return `${this.config.emergence.skill_prefix}${words.join(" ")}`.trim();
  }

  /**
   * Gerar descrição da skill baseado no padrão
   */
  private generateSkillDescription(pattern: DetectedPattern): string {
    return `
Automação detectada para: ${pattern.action_type}

Padrão observado:
- Ocorrências: ${pattern.occurrences}x nos últimos ${pattern.time_window_days} dias
- Frequência: ${pattern.metadata?.frequency_per_week} vezes/semana
- Intervalo médio: ${pattern.metadata?.average_interval_hours} horas
- Confiança: ${(pattern.confidence * 100).toFixed(1)}%

Esta skill automatizará essa ação repetitiva para você.
    `.trim();
  }

  /**
   * Gerar preview da automação
   */
  private generateAutomationPreview(pattern: DetectedPattern): string {
    return `
# Automação Proposta

**Trigger:** Quando ocorre ${pattern.action_type}
**Frequência:** A cada ${pattern.metadata?.average_interval_hours} horas aproximadamente
**Ação:** Executar automaticamente

Esta skill vai:
1. Monitorar quando você executa a ação: ${pattern.action_type}
2. Ao detectar o padrão, executar automaticamente
3. Salvar tempo e aumentar produtividade

**Status:** Pronto para criar como DRAFT e publicar após aprovação
    `.trim();
  }

  /**
   * Handler: Usuário confirmou uma sugestão
   *
   * Fluxo:
   * 1. Validar sugestão
   * 2. Chamar SkillEmergence para gerar código
   * 3. Armazenar skill como DRAFT
   * 4. Notificar Dev Center
   */
  private async handleUserConfirmation(suggestionId: string): Promise<void> {
    try {
      const suggestion = this.suggestions.get(suggestionId);

      if (!suggestion) {
        console.error(`[OpenClawEngine] Sugestão não encontrada: ${suggestionId}`);
        return;
      }

      console.log(`[OpenClawEngine] Processando confirmação do usuário para: ${suggestion.suggested_skill_name}`);

      // 1. Gerar skill (código) via Blackboard
      const skillDraft = await this.skillEmergence.generateSkillDraft(suggestion);

      if (!skillDraft) {
        console.error("[OpenClawEngine] Falha ao gerar skill");
        this.emit("error", new Error("Failed to generate skill draft"));
        return;
      }

      // 2. Atualizar status da sugestão
      suggestion.status = "accepted";

      // 3. Emitir evento de sucesso
      this.emit("skill-created", {
        suggestion,
        skill: skillDraft,
        timestamp: new Date(),
      });

      // 4. Notificar via Socket.IO (para frontend)
      if (this.socketIO) {
        this.socketIO.emit("openclaw:skill-created", {
          skill: skillDraft,
          suggestion,
          message: `Skill "${suggestion.suggested_skill_name}" criada com sucesso! Vá para Dev Center para publicar.`,
        });
      }

      console.log("[OpenClawEngine] Skill criada com sucesso:", skillDraft.id);
    } catch (error) {
      console.error("[OpenClawEngine] Erro ao processar confirmação:", error);
      this.emit("error", error);
    }
  }

  /**
   * Notificar admins sobre novo padrão detectado
   */
  private async notifyAdmins(pattern: DetectedPattern, suggestion: SkillSuggestion): Promise<void> {
    // TODO: Implementar notificação
    // Opções:
    // 1. Email para admins
    // 2. Notificação em dashboard
    // 3. Alerta no Slack/Discord
    // 4. Entry em audit log

    console.log(
      `[OpenClawEngine] Admin notificado: Novo padrão ${pattern.action_type} (confiança: ${pattern.confidence})`
    );
  }

  /**
   * Verificar padrões periodicamente (para ser chamado por scheduler)
   */
  async checkForPatternsScheduled(tenantId: string): Promise<void> {
    if (!this.config.pattern_detection.enabled) {
      return;
    }

    console.log(`[OpenClawEngine] Verificação agendada de padrões para tenant: ${tenantId}`);

    try {
      await this.patternDetector.checkForNewPatterns(tenantId);
    } catch (error) {
      console.error("[OpenClawEngine] Erro na verificação agendada:", error);
    }
  }

  /**
   * Iniciar verificação periódica de padrões
   */
  startScheduledChecks(tenantId: string): void {
    if (this.checkInterval) {
      console.log("[OpenClawEngine] Verificação agendada já está ativa");
      return;
    }

    const intervalMs = this.config.pattern_detection.scheduled_check_interval_minutes * 60 * 1000;

    this.checkInterval = setInterval(() => {
      this.checkForPatternsScheduled(tenantId);
    }, intervalMs);

    console.log(
      `[OpenClawEngine] Verificação agendada iniciada (a cada ${this.config.pattern_detection.scheduled_check_interval_minutes} min)`
    );
  }

  /**
   * Parar verificação periódica
   */
  stopScheduledChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
      console.log("[OpenClawEngine] Verificação agendada interrompida");
    }
  }

  /**
   * Obter sugestões pendentes para um usuário
   */
  getPendingSuggestions(userId?: string): SkillSuggestion[] {
    const suggestions = Array.from(this.suggestions.values()).filter((s) => s.status === "pending");

    if (userId) {
      return suggestions.filter((s) => s.pattern.user_id === userId);
    }

    return suggestions;
  }

  /**
   * Obter configuração
   */
  getConfig(): OpenClawEngineConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Atualizar configuração
   */
  setConfig(config: Partial<OpenClawEngineConfig>): void {
    this.config = { ...this.config, ...config };
    console.log("[OpenClawEngine] Configuração atualizada");

    // Atualizar PatternDetector se necessário
    if (config.pattern_detection) {
      this.patternDetector.setConfig(config.pattern_detection);
    }
  }
}

// Exportar instância singleton
let engineInstance: OpenClawEngine | null = null;

export function getOpenClawEngine(
  config?: Partial<OpenClawEngineConfig>,
  socketIO?: SocketIOServer
): OpenClawEngine {
  if (!engineInstance) {
    engineInstance = new OpenClawEngine(config || {}, socketIO);
  }
  return engineInstance;
}

export default OpenClawEngine;
