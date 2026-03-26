/**
 * PatternDetector.ts
 *
 * Detecção proativa de padrões de uso no Arcádia
 * Monitora eventos de usuário e identifica ações repetidas
 * para sugerir automações/skills emergentes
 *
 * Fase 4: OpenClaw Embutido
 */

import { db } from "@/db";
import { detectedPatterns, skillSuggestions } from "@/shared/schema";
import { eq, and, gte } from "drizzle-orm";
import { EventEmitter } from "events";

interface Interaction {
  id: string;
  tenant_id: string;
  user_id: string;
  action_type: string;
  action_data: Record<string, any>;
  timestamp: Date;
  context?: Record<string, any>;
}

interface DetectedPattern {
  id?: number;
  tenant_id: string;
  user_id: string;
  action_type: string;
  occurrences: number;
  confidence: number;
  time_window_days: number;
  created_at?: Date;
  metadata?: Record<string, any>;
}

interface PatternDetectorConfig {
  min_occurrences: number;
  time_window_days: number;
  confidence_threshold: number;
}

/**
 * PatternDetector
 *
 * Analisa interações de usuário e detecta padrões
 * Emite eventos quando um padrão é confirmado
 */
export class PatternDetector extends EventEmitter {
  private config: PatternDetectorConfig;
  private detectedPatterns: Map<string, DetectedPattern> = new Map();

  constructor(config: PatternDetectorConfig) {
    super();
    this.config = {
      min_occurrences: config.min_occurrences ?? 3,
      time_window_days: config.time_window_days ?? 30,
      confidence_threshold: config.confidence_threshold ?? 0.8,
    };
  }

  /**
   * Detectar padrão a partir de eventos de usuário
   *
   * Fluxo:
   * 1. Buscar interações similares do usuário (últimos N dias)
   * 2. Agrupar por tipo de ação
   * 3. Contar ocorrências
   * 4. Se >= min_occurrences: calcular confiança
   * 5. Se confiança >= threshold: emitir evento
   */
  async detectPattern(userId: string, tenantId: string, actionType: string): Promise<DetectedPattern | null> {
    try {
      // 1. Buscar interações similares
      const interactions = await this.getRecentInteractions(
        userId,
        tenantId,
        actionType,
        this.config.time_window_days
      );

      if (interactions.length < this.config.min_occurrences) {
        return null; // Insuficiente para detectar padrão
      }

      // 2. Calcular confiança
      const confidence = this.calculateConfidence(interactions);

      if (confidence < this.config.confidence_threshold) {
        return null; // Confiança insuficiente
      }

      // 3. Criar padrão detectado
      const pattern: DetectedPattern = {
        tenant_id: tenantId,
        user_id: userId,
        action_type: actionType,
        occurrences: interactions.length,
        confidence: confidence,
        time_window_days: this.config.time_window_days,
        metadata: {
          first_occurrence: interactions[0].timestamp,
          last_occurrence: interactions[interactions.length - 1].timestamp,
          frequency_per_week: (interactions.length / (this.config.time_window_days / 7)).toFixed(2),
          average_interval_hours: this.calculateAverageInterval(interactions),
        },
      };

      // 4. Armazenar padrão
      await this.storePattern(pattern);

      // 5. Emitir evento
      this.emit("pattern-detected", {
        pattern,
        timestamp: new Date(),
      });

      return pattern;
    } catch (error) {
      console.error(`[PatternDetector] Erro ao detectar padrão para ${userId}:`, error);
      return null;
    }
  }

  /**
   * Buscar interações recentes de um usuário
   */
  private async getRecentInteractions(
    userId: string,
    tenantId: string,
    actionType: string,
    days: number
  ): Promise<Interaction[]> {
    // TODO: Integrar com Learning API ou database de eventos
    // Por enquanto, retorna mock para testes

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Implementação real seria:
    // const interactions = await db.query.interactions.findMany({
    //   where: and(
    //     eq(interactions.user_id, userId),
    //     eq(interactions.tenant_id, tenantId),
    //     eq(interactions.action_type, actionType),
    //     gte(interactions.timestamp, cutoffDate)
    //   ),
    //   orderBy: (interactions) => interactions.timestamp,
    // });

    return [];
  }

  /**
   * Calcular confiança do padrão
   *
   * Fatores:
   * - Frequência (quantas vezes foi executado)
   * - Regularidade (quão consistente é o intervalo)
   * - Recência (foi feito recentemente)
   */
  private calculateConfidence(interactions: Interaction[]): number {
    if (interactions.length === 0) return 0;

    // Fator 1: Frequência (normalizado para 0-1)
    const frequencyFactor = Math.min(interactions.length / 10, 1.0); // max 10 é 100% confiança

    // Fator 2: Regularidade (quão consistente é o intervalo)
    const intervals = this.calculateIntervals(interactions);
    const regularityFactor = this.calculateRegularity(intervals);

    // Fator 3: Recência (foi feito nos últimos 7 dias)
    const recencyFactor = this.calculateRecency(interactions);

    // Confiança = média ponderada
    const confidence = (frequencyFactor * 0.4) + (regularityFactor * 0.35) + (recencyFactor * 0.25);

    return parseFloat(confidence.toFixed(2));
  }

  /**
   * Calcular intervalos entre interações
   */
  private calculateIntervals(interactions: Interaction[]): number[] {
    const intervals: number[] = [];

    for (let i = 1; i < interactions.length; i++) {
      const prevTime = interactions[i - 1].timestamp.getTime();
      const currTime = interactions[i].timestamp.getTime();
      const intervalHours = (currTime - prevTime) / (1000 * 60 * 60);
      intervals.push(intervalHours);
    }

    return intervals;
  }

  /**
   * Calcular regularidade (consistência dos intervalos)
   *
   * Se os intervalos são muito diferentes, confiança cai
   * Se são similares, confiança sobe
   */
  private calculateRegularity(intervals: number[]): number {
    if (intervals.length === 0) return 0;

    const average = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => {
      return sum + Math.pow(interval - average, 2);
    }, 0) / intervals.length;

    const stdDeviation = Math.sqrt(variance);
    const coefficientOfVariation = stdDeviation / average; // Quão variado é

    // Se CV é baixo (< 0.5), alta regularidade
    // Se CV é alto (> 1.0), baixa regularidade
    const regularity = Math.max(0, 1 - (coefficientOfVariation / 2));

    return Math.min(regularity, 1.0);
  }

  /**
   * Calcular recência (quanto tempo desde a última ação)
   */
  private calculateRecency(interactions: Interaction[]): number {
    if (interactions.length === 0) return 0;

    const lastInteraction = interactions[interactions.length - 1];
    const daysSinceLastAction = (Date.now() - lastInteraction.timestamp.getTime()) / (1000 * 60 * 60 * 24);

    // Se foi nos últimos 7 dias: alta confiança
    // Se foi há mais de 30 dias: baixa confiança
    if (daysSinceLastAction <= 7) return 1.0;
    if (daysSinceLastAction > 30) return 0.2;

    return 1.0 - (daysSinceLastAction - 7) / (30 - 7) * 0.8;
  }

  /**
   * Calcular intervalo médio entre interações (em horas)
   */
  private calculateAverageInterval(interactions: Interaction[]): number {
    const intervals = this.calculateIntervals(interactions);
    if (intervals.length === 0) return 0;

    const average = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return parseFloat(average.toFixed(2));
  }

  /**
   * Armazenar padrão detectado em database
   */
  private async storePattern(pattern: DetectedPattern): Promise<void> {
    try {
      await db.insert(detectedPatterns).values({
        tenant_id: pattern.tenant_id,
        user_id: pattern.user_id,
        action_type: pattern.action_type,
        occurrences: pattern.occurrences,
        confidence: pattern.confidence.toString(),
        time_window_days: pattern.time_window_days,
        metadata: pattern.metadata,
        created_at: new Date(),
      });

      console.log(`[PatternDetector] Padrão armazenado: ${pattern.action_type} (confiança: ${pattern.confidence})`);
    } catch (error) {
      console.error(`[PatternDetector] Erro ao armazenar padrão:`, error);
      throw error;
    }
  }

  /**
   * Obter padrões detectados para um usuário
   */
  async getPatternsForUser(userId: string, tenantId: string): Promise<DetectedPattern[]> {
    try {
      const patterns = await db
        .select()
        .from(detectedPatterns)
        .where(and(eq(detectedPatterns.user_id, userId), eq(detectedPatterns.tenant_id, tenantId)));

      return patterns as DetectedPattern[];
    } catch (error) {
      console.error(`[PatternDetector] Erro ao buscar padrões:`, error);
      return [];
    }
  }

  /**
   * Verificar periodicamente por novos padrões
   * (Para ser chamado por um scheduler/cron)
   */
  async checkForNewPatterns(tenantId: string): Promise<void> {
    console.log(`[PatternDetector] Verificando novos padrões para tenant: ${tenantId}`);

    // TODO: Implementar lógica para:
    // 1. Buscar todos os usuários do tenant
    // 2. Buscar suas interações recentes
    // 3. Agrupar por tipo de ação
    // 4. Chamar detectPattern para cada agrupamento
    // 5. Emitir eventos para padrões confirmados
  }

  /**
   * Obter configuração atual
   */
  getConfig(): PatternDetectorConfig {
    return { ...this.config };
  }

  /**
   * Atualizar configuração
   */
  setConfig(config: Partial<PatternDetectorConfig>): void {
    this.config = { ...this.config, ...config };
    console.log(`[PatternDetector] Configuração atualizada:`, this.config);
  }
}

// Exportar instância singleton
let detectorInstance: PatternDetector | null = null;

export function getPatternDetector(config?: PatternDetectorConfig): PatternDetector {
  if (!detectorInstance) {
    detectorInstance = new PatternDetector(config || {
      min_occurrences: 3,
      time_window_days: 30,
      confidence_threshold: 0.8,
    });
  }
  return detectorInstance;
}

export default PatternDetector;
