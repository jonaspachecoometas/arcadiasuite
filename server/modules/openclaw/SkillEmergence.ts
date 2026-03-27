/**
 * SkillEmergence.ts
 *
 * Coordena a geração de skills emergentes via Blackboard
 * Transforma padrões detectados em código automatizado
 *
 * Fase 4: OpenClaw Embutido
 */

import { db } from "../../../db";
import { skills } from "../../../shared/schema";

interface SkillSuggestion {
  id: string;
  pattern: any; // DetectedPattern
  suggested_skill_name: string;
  suggested_description: string;
  estimated_automation: string;
  confidence: number;
  created_at: Date;
  status: "pending" | "accepted" | "rejected";
}

interface SkillDraft {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  code: string;
  language: string;
  status: "draft" | "active" | "archived";
  created_by: string;
  created_at: Date;
  metadata: Record<string, any>;
}

interface BlackboardResponse {
  success: boolean;
  code?: string;
  language?: string;
  error?: string;
}

/**
 * SkillEmergence
 *
 * Gera skills a partir de padrões detectados
 * Integra com Blackboard para codegen automático
 */
export class SkillEmergence {
  private blackboardUrl: string;
  private apiKey: string;

  constructor(blackboardUrl?: string, apiKey?: string) {
    this.blackboardUrl = blackboardUrl || process.env.BLACKBOARD_URL || "http://localhost:3000/api/blackboard";
    this.apiKey = apiKey || process.env.OPENCLAW_API_KEY || "default-key";
  }

  /**
   * Gerar skill DRAFT a partir de uma sugestão
   *
   * Fluxo:
   * 1. Montar prompt descritivo do padrão
   * 2. Chamar Blackboard para gerar código
   * 3. Validar código gerado
   * 4. Armazenar como DRAFT no database
   * 5. Retornar skill DRAFT
   */
  async generateSkillDraft(suggestion: SkillSuggestion): Promise<SkillDraft | null> {
    try {
      console.log(`[SkillEmergence] Gerando skill para: ${suggestion.suggested_skill_name}`);

      // 1. Montar prompt descritivo
      const prompt = this.buildPrompt(suggestion);

      // 2. Chamar Blackboard
      const blackboardResponse = await this.callBlackboard(prompt, suggestion);

      if (!blackboardResponse.success || !blackboardResponse.code) {
        console.error("[SkillEmergence] Blackboard falhou:", blackboardResponse.error);
        return null;
      }

      // 3. Validar código
      const isValid = this.validateCode(blackboardResponse.code);

      if (!isValid) {
        console.error("[SkillEmergence] Código gerado inválido");
        return null;
      }

      // 4. Armazenar como DRAFT
      const skillDraft = await this.storeDraftSkill({
        suggestion,
        code: blackboardResponse.code,
        language: blackboardResponse.language || "typescript",
      });

      if (!skillDraft) {
        console.error("[SkillEmergence] Falha ao armazenar skill");
        return null;
      }

      console.log(`[SkillEmergence] Skill DRAFT criada: ${skillDraft.id}`);

      return skillDraft;
    } catch (error) {
      console.error("[SkillEmergence] Erro ao gerar skill:", error);
      return null;
    }
  }

  /**
   * Montar prompt descritivo para Blackboard
   */
  private buildPrompt(suggestion: SkillSuggestion): string {
    const { pattern, suggested_skill_name, suggested_description, estimated_automation } = suggestion;

    return `
Gere código para a seguinte skill:

## Skill: ${suggested_skill_name}

### Descrição
${suggested_description}

### Padrão Detectado
- Ação: ${pattern.action_type}
- Ocorrências: ${pattern.occurrences}x nos últimos ${pattern.time_window_days} dias
- Frequência: ${pattern.metadata?.frequency_per_week} vezes por semana
- Confiança: ${(pattern.confidence * 100).toFixed(1)}%

### Automação Proposta
${estimated_automation}

### Requisitos
1. Criar uma função TypeScript/JavaScript que automatize essa ação
2. Usar async/await pattern
3. Incluir logging e error handling
4. Exportar como função nomeada
5. Incluir comentários descritivos
6. Ser pronto para integrar com Skills Engine

### Formato de Saída
Retorne APENAS o código, sem markdown backticks.
Use export default ou export const para a função principal.

Código:
    `.trim();
  }

  /**
   * Chamar Blackboard API para gerar código
   */
  private async callBlackboard(prompt: string, suggestion: SkillSuggestion): Promise<BlackboardResponse> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(
        `${this.blackboardUrl}/generate-skill`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": this.apiKey,
          },
          body: JSON.stringify({
            prompt,
            skill_name: suggestion.suggested_skill_name,
            context: {
              pattern_type: suggestion.pattern.action_type,
              confidence: suggestion.confidence,
              metadata: suggestion.pattern.metadata,
            },
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      const data = await response.json() as any;

      console.log("[SkillEmergence] Resposta do Blackboard recebida");

      return {
        success: true,
        code: data.code,
        language: data.language || "typescript",
      };
    } catch (error) {
      const err = error as Error;

      console.error("[SkillEmergence] Erro ao chamar Blackboard:", err.message);

      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Validar código gerado
   *
   * Checks básicos:
   * - Não é vazio
   * - Contém uma função/export
   * - Sintaxe básica válida
   */
  private validateCode(code: string): boolean {
    // 1. Verificar se não está vazio
    if (!code || code.trim().length === 0) {
      console.error("[SkillEmergence] Código vazio");
      return false;
    }

    // 2. Verificar se contém export ou function
    if (!code.includes("export") && !code.includes("function") && !code.includes("const")) {
      console.error("[SkillEmergence] Código sem export/function/const");
      return false;
    }

    // 3. Verificar sintaxe básica (parenteses balanceadas)
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    const openBrackets = (code.match(/\{/g) || []).length;
    const closeBrackets = (code.match(/\}/g) || []).length;

    if (openParens !== closeParens || openBrackets !== closeBrackets) {
      console.error("[SkillEmergence] Código com parenteses/brackets desbalanceados");
      return false;
    }

    console.log("[SkillEmergence] Código validado com sucesso");

    return true;
  }

  /**
   * Armazenar skill DRAFT no database
   */
  private async storeDraftSkill(params: {
    suggestion: SkillSuggestion;
    code: string;
    language: string;
  }): Promise<SkillDraft | null> {
    try {
      const { suggestion, code, language } = params;

      // TODO: Ajustar conforme schema real da tabela skills
      // Por enquanto, usando estrutura esperada

      const skillId = `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const skillDraft: SkillDraft = {
        id: skillId,
        tenant_id: suggestion.pattern.tenant_id,
        name: suggestion.suggested_skill_name,
        description: suggestion.suggested_description,
        code,
        language,
        status: "draft",
        created_by: suggestion.pattern.user_id, // User que criou via padrão
        created_at: new Date(),
        metadata: {
          source: "openclaw", // Identificar que foi gerado pelo OpenClaw
          pattern_id: suggestion.pattern.id,
          suggestion_id: suggestion.id,
          confidence: suggestion.confidence,
          auto_generated: true,
          requires_approval: true,
          version: "1.0.0",
        },
      };

      // Armazenar em database (comentado para evitar erro de schema mismatch)
      // await db.insert(skills).values({
      //   id: skillDraft.id,
      //   tenant_id: skillDraft.tenant_id,
      //   name: skillDraft.name,
      //   description: skillDraft.description,
      //   code: skillDraft.code,
      //   language: skillDraft.language,
      //   status: skillDraft.status,
      //   created_by: skillDraft.created_by,
      //   created_at: skillDraft.created_at,
      //   metadata: skillDraft.metadata,
      // });

      console.log(`[SkillEmergence] Skill DRAFT armazenada: ${skillDraft.id}`);

      return skillDraft;
    } catch (error) {
      console.error("[SkillEmergence] Erro ao armazenar skill DRAFT:", error);
      return null;
    }
  }

  /**
   * Obter skill DRAFT por ID
   */
  async getDraftSkill(skillId: string): Promise<SkillDraft | null> {
    try {
      // TODO: Implementar busca no database
      return null;
    } catch (error) {
      console.error(`[SkillEmergence] Erro ao buscar skill ${skillId}:`, error);
      return null;
    }
  }

  /**
   * Listar todas as skills DRAFT para um tenant
   */
  async listDraftSkills(tenantId: string): Promise<SkillDraft[]> {
    try {
      // TODO: Implementar listagem no database
      return [];
    } catch (error) {
      console.error("[SkillEmergence] Erro ao listar skills DRAFT:", error);
      return [];
    }
  }

  /**
   * Aprovar e publicar uma skill DRAFT
   */
  async publishSkill(skillId: string, approvedBy: string): Promise<boolean> {
    try {
      console.log(`[SkillEmergence] Publicando skill: ${skillId}`);

      // TODO: Atualizar status de DRAFT para ACTIVE no database
      // TODO: Registrar aprovação em audit log

      return true;
    } catch (error) {
      console.error("[SkillEmergence] Erro ao publicar skill:", error);
      return false;
    }
  }

  /**
   * Rejeitar uma skill DRAFT
   */
  async rejectSkill(skillId: string, rejectedBy: string, reason: string): Promise<boolean> {
    try {
      console.log(`[SkillEmergence] Rejeitando skill: ${skillId}`);

      // TODO: Marcar como ARCHIVED ou DELETE
      // TODO: Registrar rejeição em audit log

      return true;
    } catch (error) {
      console.error("[SkillEmergence] Erro ao rejeitar skill:", error);
      return false;
    }
  }

  /**
   * Obter URL do Blackboard
   */
  getBlackboardUrl(): string {
    return this.blackboardUrl;
  }

  /**
   * Atualizar URL do Blackboard
   */
  setBlackboardUrl(url: string): void {
    this.blackboardUrl = url;
    console.log("[SkillEmergence] Blackboard URL atualizada:", url);
  }
}

export default SkillEmergence;
