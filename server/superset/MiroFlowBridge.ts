/**
 * MiroFlow Bridge para Apache Superset
 *
 * Adaptador que conecta Superset com MiroFlow para análises científicas.
 * Fluxo: SQL (Superset) → MiroFlow (análise) → Enriquecimento de dados → KG (provenance)
 */

import type { Request, Response } from "express";
import { createNode } from "../graph/service";
import crypto from "crypto";

interface MiroFlowConfig {
  type?: "exploratory" | "forecast" | "anomaly" | "hypothesis" | "causal";
  horizon?: number; // dias para forecast
  confidence_level?: number; // 0.90, 0.95, 0.99
  methods?: string[]; // ["arima", "prophet", "statistical_test", etc]
}

interface SupersetDataset {
  data: Record<string, any>[];
  columns: string[];
  index?: number[];
}

interface MiroFlowResult {
  execution_id: string;
  agent: string;
  model: string;
  result: {
    summary: string;
    analysis_type: string;
    descriptive_stats?: Record<string, any>;
    anomalies?: Array<{ index: number; score: number; value: any }>;
    forecast?: { values: number[]; lower_bound: number[]; upper_bound: number[] };
    hypothesis_test?: { p_value: number; result: string };
    confidence_intervals?: Record<string, [number, number]>;
  };
  metadata: {
    execution_time_ms: number;
    rows_analyzed: number;
    columns_used: string[];
  };
}

export interface EnrichedDataset extends SupersetDataset {
  _miroflow_analysis: string;
  _miroflow_type: string;
  _confidence_intervals?: Record<string, [number, number]>;
  _anomaly_scores?: Record<number, number>;
  _forecast?: { values: number[]; lower_bound: number[]; upper_bound: number[] };
  _metadata: {
    analysis_executed_at: string;
    miroflow_execution_id: string;
    miroflow_model: string;
    execution_time_ms: number;
  };
}

/**
 * MiroFlowBridge: Proxy entre Superset e MiroFlow
 * Enriquece datasets SQL com análises científicas
 */
export class MiroFlowBridge {
  private miroflowBaseUrl: string;
  private miroflowTimeout: number = 300_000; // 5 min

  constructor(miroflowBaseUrl: string = "http://localhost:8006") {
    this.miroflowBaseUrl = miroflowBaseUrl;
  }

  /**
   * Analisa dataset via MiroFlow
   */
  async analyze(
    dataset: SupersetDataset,
    config: MiroFlowConfig,
    tenantId?: number,
    userId?: number
  ): Promise<MiroFlowResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.miroflowTimeout);

    try {
      const payload = {
        dataset: JSON.stringify(dataset),
        analysis_type: config.type || "exploratory",
        config,
        tenant_id: tenantId,
        user_id: userId,
        source: "superset_bridge",
      };

      const response = await fetch(`${this.miroflowBaseUrl}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(`MiroFlow error: ${err.detail || response.status}`);
      }

      return await response.json();
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        throw new Error("MiroFlow analysis timeout (5 min)");
      }
      throw err;
    }
  }

  /**
   * Enriquece dataset com resultados da análise
   */
  enrich(dataset: SupersetDataset, result: MiroFlowResult): EnrichedDataset {
    const enriched: EnrichedDataset = {
      ...dataset,
      _miroflow_analysis: result.result.summary,
      _miroflow_type: result.result.analysis_type,
      _metadata: {
        analysis_executed_at: new Date().toISOString(),
        miroflow_execution_id: result.execution_id,
        miroflow_model: result.model,
        execution_time_ms: result.metadata.execution_time_ms,
      },
    };

    // Adicionar intervalos de confiança
    if (result.result.confidence_intervals) {
      enriched._confidence_intervals = result.result.confidence_intervals;
    }

    // Adicionar scores de anomalias (mapeados para índices)
    if (result.result.anomalies && result.result.anomalies.length > 0) {
      enriched._anomaly_scores = {};
      result.result.anomalies.forEach((anom) => {
        enriched._anomaly_scores![anom.index] = anom.score;
      });
    }

    // Adicionar forecast
    if (result.result.forecast) {
      enriched._forecast = result.result.forecast;
    }

    return enriched;
  }

  /**
   * Registra análise no Knowledge Graph para provenance
   */
  async registerInKG(
    result: MiroFlowResult,
    dataset: SupersetDataset,
    config: MiroFlowConfig,
    req: Request
  ): Promise<void> {
    try {
      const analysisHash = crypto
        .createHash("sha256")
        .update(
          JSON.stringify({
            execution_id: result.execution_id,
            dataset_columns: dataset.columns,
            config,
            result: result.result,
          })
        )
        .digest("hex");

      await createNode({
        type: "miroflow_analysis",
        tenantId: (req.user as any)?.tenantId ?? null,
        data: {
          execution_id: result.execution_id,
          agent: result.agent,
          model: result.model,
          analysis_type: result.result.analysis_type,
          dataset_shape: `${dataset.data.length}x${dataset.columns.length}`,
          columns_analyzed: dataset.columns,
          config,
          summary: result.result.summary,
          execution_time_ms: result.metadata.execution_time_ms,
          analysisHash,
          immutable: true,
          source: "superset_bridge",
          registeredAt: new Date().toISOString(),
        },
      });
    } catch (kgErr: any) {
      console.error("[MiroFlow Bridge] Falha ao registrar análise no KG:", kgErr.message);
      // Não bloqueia a resposta — logging apenas
    }
  }

  /**
   * Handler Express para POST /api/superset/miroflow/analyze
   * Superset envia dataset SQL-resultante e config de análise
   */
  async handleAnalyzeRequest(req: Request, res: Response): Promise<void> {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }

    try {
      const { dataset, config }: { dataset: SupersetDataset; config: MiroFlowConfig } =
        req.body;

      if (!dataset || !dataset.data || !dataset.columns) {
        res.status(400).json({ error: "Dataset inválido: data e columns obrigatórios" });
        return;
      }

      // Executar análise no MiroFlow
      const result = await this.analyze(dataset, config, (req.user as any)?.tenantId, (req.user as any)?.id);

      // Enriquecer dataset
      const enriched = this.enrich(dataset, result);

      // Registrar no KG (assíncrono, não bloqueia)
      this.registerInKG(result, dataset, config, req).catch(() => {});

      // Retornar dados enriquecidos
      res.json({
        success: true,
        data: enriched,
        analysis: result.result,
        execution_id: result.execution_id,
      });
    } catch (err: any) {
      console.error("[MiroFlow Bridge] Erro:", err.message);
      res.status(502).json({
        error: err.message,
        source: "miroflow_bridge",
      });
    }
  }
}

/**
 * Factory para criar instância do bridge
 */
export function createMiroFlowBridge(miroflowUrl?: string): MiroFlowBridge {
  return new MiroFlowBridge(miroflowUrl || process.env.MIROFLOW_URL || "http://localhost:8006");
}
