/**
 * routes.ts - OpenClaw Routes
 *
 * Endpoints para:
 * - Detecção manual de padrões
 * - Listagem de padrões
 * - Confirmação de sugestões
 * - Histórico de sugestões
 *
 * Fase 4: OpenClaw Embutido
 */

import { Router, Request, Response } from "express";
import { getOpenClawEngine } from "./OpenClawEngine";
import { getPatternDetector } from "./PatternDetector";

const router = Router();
const engine = getOpenClawEngine();
const detector = getPatternDetector();

/**
 * POST /api/openclaw/detect-patterns
 *
 * Trigger manual de detecção de padrões
 * Útil para testes e verificação sob demanda
 */
router.post("/detect-patterns", async (req: Request, res: Response) => {
  try {
    const { user_id, tenant_id, action_type } = req.body;

    // Validar entrada
    if (!user_id || !tenant_id || !action_type) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: user_id, tenant_id, action_type",
      });
    }

    // Detectar padrão
    const pattern = await engine.detectPattern(user_id, tenant_id, action_type);

    if (!pattern) {
      return res.status(200).json({
        success: true,
        pattern: null,
        message: "Nenhum padrão detectado (insuficiente ocorrências ou confiança baixa)",
      });
    }

    return res.status(200).json({
      success: true,
      pattern,
      message: `Padrão detectado com confiança ${(pattern.confidence * 100).toFixed(1)}%`,
    });
  } catch (error: any) {
    console.error("[OpenClaw Routes] Erro em detect-patterns:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

/**
 * GET /api/openclaw/patterns
 *
 * Listar padrões detectados para um usuário
 * Query params:
 * - user_id (required)
 * - tenant_id (required)
 * - action_type (optional) - filtrar por tipo de ação
 */
router.get("/patterns", async (req: Request, res: Response) => {
  try {
    const { user_id, tenant_id, action_type } = req.query;

    if (!user_id || !tenant_id) {
      return res.status(400).json({
        success: false,
        error: "Missing required query params: user_id, tenant_id",
      });
    }

    // Buscar padrões do usuário
    const patterns = await detector.getPatternsForUser(user_id as string, tenant_id as string);

    // Filtrar por action_type se especificado
    const filtered = action_type
      ? patterns.filter((p) => p.action_type === action_type)
      : patterns;

    return res.status(200).json({
      success: true,
      patterns: filtered,
      count: filtered.length,
    });
  } catch (error: any) {
    console.error("[OpenClaw Routes] Erro em GET patterns:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

/**
 * POST /api/openclaw/confirm-skill
 *
 * Usuário confirma uma sugestão de skill
 *
 * Body:
 * {
 *   suggestion_id: string,
 *   user_id: string,
 *   tenant_id: string
 * }
 */
router.post("/confirm-skill", async (req: Request, res: Response) => {
  try {
    const { suggestion_id, user_id, tenant_id } = req.body;

    if (!suggestion_id || !user_id || !tenant_id) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: suggestion_id, user_id, tenant_id",
      });
    }

    console.log(`[OpenClaw Routes] Confirmação recebida para sugestão: ${suggestion_id}`);

    // Emitir evento de confirmação do usuário
    engine.emit("user-confirmed-suggestion", suggestion_id);

    // Aguardar um pouco para skill ser gerada (não ideal, melhorar com callbacks)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return res.status(200).json({
      success: true,
      message: "Sugestão confirmada! Gerando skill...",
      suggestion_id,
    });
  } catch (error: any) {
    console.error("[OpenClaw Routes] Erro em confirm-skill:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

/**
 * GET /api/openclaw/suggestions
 *
 * Listar sugestões pendentes
 * Query params:
 * - user_id (optional) - filtrar por usuário
 * - status (optional) - 'pending', 'accepted', 'rejected'
 */
router.get("/suggestions", async (req: Request, res: Response) => {
  try {
    const { user_id, status } = req.query;

    // Buscar sugestões pendentes
    const suggestions = engine.getPendingSuggestions(user_id as string | undefined);

    // Filtrar por status se especificado
    const filtered = status
      ? suggestions.filter((s) => s.status === status)
      : suggestions;

    return res.status(200).json({
      success: true,
      suggestions: filtered,
      count: filtered.length,
    });
  } catch (error: any) {
    console.error("[OpenClaw Routes] Erro em GET suggestions:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

/**
 * GET /api/openclaw/config
 *
 * Obter configuração atual do OpenClaw
 * (Para admin panel ou debugging)
 */
router.get("/config", async (req: Request, res: Response) => {
  try {
    const config = engine.getConfig();

    return res.status(200).json({
      success: true,
      config,
    });
  } catch (error: any) {
    console.error("[OpenClaw Routes] Erro em GET config:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

/**
 * POST /api/openclaw/config
 *
 * Atualizar configuração do OpenClaw
 * (Apenas para admins)
 *
 * Body: Partial<OpenClawEngineConfig>
 */
router.post("/config", async (req: Request, res: Response) => {
  try {
    // TODO: Validar permissões de admin

    const config = req.body;

    engine.setConfig(config);

    return res.status(200).json({
      success: true,
      message: "Configuração atualizada",
      config: engine.getConfig(),
    });
  } catch (error: any) {
    console.error("[OpenClaw Routes] Erro em POST config:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

/**
 * POST /api/openclaw/check-now
 *
 * Verificar padrões agora (não aguardar scheduler)
 * Query param: tenant_id (required)
 */
router.post("/check-now", async (req: Request, res: Response) => {
  try {
    const { tenant_id } = req.body;

    if (!tenant_id) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: tenant_id",
      });
    }

    console.log(`[OpenClaw Routes] Verificação manual disparada para tenant: ${tenant_id}`);

    // Disparar verificação (não aguardar)
    engine.checkForPatternsScheduled(tenant_id).catch((error) => {
      console.error("[OpenClaw Routes] Erro na verificação manual:", error);
    });

    return res.status(200).json({
      success: true,
      message: "Verificação de padrões iniciada",
    });
  } catch (error: any) {
    console.error("[OpenClaw Routes] Erro em check-now:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

/**
 * POST /api/openclaw/start-scheduler
 *
 * Iniciar scheduler de verificação periódica
 * Query param: tenant_id (required)
 */
router.post("/start-scheduler", async (req: Request, res: Response) => {
  try {
    const { tenant_id } = req.body;

    if (!tenant_id) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: tenant_id",
      });
    }

    engine.startScheduledChecks(tenant_id);

    return res.status(200).json({
      success: true,
      message: `Scheduler iniciado para tenant: ${tenant_id}`,
    });
  } catch (error: any) {
    console.error("[OpenClaw Routes] Erro em start-scheduler:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

/**
 * POST /api/openclaw/stop-scheduler
 *
 * Parar scheduler de verificação periódica
 */
router.post("/stop-scheduler", async (req: Request, res: Response) => {
  try {
    engine.stopScheduledChecks();

    return res.status(200).json({
      success: true,
      message: "Scheduler interrompido",
    });
  } catch (error: any) {
    console.error("[OpenClaw Routes] Erro em stop-scheduler:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

/**
 * GET /api/openclaw/health
 *
 * Health check do OpenClaw
 */
router.get("/health", (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    status: "healthy",
    module: "openclaw",
    timestamp: new Date(),
  });
});

export default router;
