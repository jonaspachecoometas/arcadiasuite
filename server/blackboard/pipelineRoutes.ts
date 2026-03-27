import { Router, Request, Response } from "express";
import { pipelineOrchestrator } from "./PipelineOrchestrator";
import { z } from "zod";

const router = Router();

const createPipelineSchema = z.object({
  prompt: z.string().min(5, "O prompt deve ter pelo menos 5 caracteres"),
  metadata: z.record(z.any()).optional(),
  budget: z.object({
    maxTokens: z.number().optional(),
    maxTimeMs: z.number().optional(),
    maxCalls: z.number().optional(),
  }).optional(),
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = createPipelineSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }

    const userId = (req.user as any)?.id || "anonymous";
    const metadata = { ...(parsed.data.metadata || {}), budget: parsed.data.budget };
    const pipeline = await pipelineOrchestrator.createPipeline(parsed.data.prompt, userId, metadata);
    const started = await pipelineOrchestrator.startPipeline(pipeline.id);

    res.json({ success: true, pipeline: started });
  } catch (error: any) {
    console.error("[Pipeline] Erro ao criar:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const pipelines = await pipelineOrchestrator.getRecentPipelines(limit);
    const enriched = await Promise.all(pipelines.map(async (p: any) => {
      const pendingCount = await pipelineOrchestrator.getPendingStagingCount(p.id);
      return { ...p, hasPendingChanges: pendingCount > 0, pendingStagingCount: pendingCount };
    }));
    res.json({ success: true, pipelines: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const details = await pipelineOrchestrator.getPipelineWithDetails(id);
    if (!details) {
      return res.status(404).json({ success: false, error: "Pipeline não encontrado" });
    }
    res.json({ success: true, ...details });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/:id/staging", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const changes = await pipelineOrchestrator.getStagingChanges(id);
    res.json({ success: true, changes });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/:id/runbook", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const runbook = await pipelineOrchestrator.getPipelineRunbook(id);
    if (!runbook) {
      return res.status(404).json({ success: false, error: "Runbook não encontrado" });
    }
    res.json({ success: true, runbook });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const approveSchema = z.object({
  selectedFiles: z.array(z.string()).optional(),
});

router.post("/:id/approve", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const parsed = approveSchema.safeParse(req.body);
    const selectedFiles = parsed.success ? parsed.data.selectedFiles : undefined;
    const reviewedBy = (req.user as any)?.id || "user";
    const result = await pipelineOrchestrator.approveStagingChanges(id, reviewedBy, selectedFiles);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/:id/reject", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const reviewedBy = (req.user as any)?.id || "user";
    await pipelineOrchestrator.rejectStagingChanges(id, reviewedBy);
    res.json({ success: true, message: "Alterações rejeitadas" });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/:id/rollback", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const rolledBackBy = (req.user as any)?.id || "user";
    const result = await pipelineOrchestrator.rollbackPipeline(id, rolledBackBy);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/:id/stream", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onPhaseStarted = (d: any) => { if (d.pipelineId === id) sendEvent("phase_started", d); };
  const onPhaseCompleted = (d: any) => { if (d.pipelineId === id) sendEvent("phase_completed", d); };
  const onStagingReady = (d: any) => { if (d.pipelineId === id) sendEvent("staging_ready", d); };
  const onCompleted = (d: any) => { if (d.pipelineId === id) sendEvent("completed", d); };
  const onFailed = (d: any) => { if (d.pipelineId === id) sendEvent("failed", d); };
  const onRolledBack = (d: any) => { if (d.pipelineId === id) sendEvent("rolled_back", d); };

  pipelineOrchestrator.on("pipeline:phase_started", onPhaseStarted);
  pipelineOrchestrator.on("pipeline:phase_completed", onPhaseCompleted);
  pipelineOrchestrator.on("pipeline:staging_ready", onStagingReady);
  pipelineOrchestrator.on("pipeline:completed", onCompleted);
  pipelineOrchestrator.on("pipeline:failed", onFailed);
  pipelineOrchestrator.on("pipeline:rolled_back", onRolledBack);

  const pollInterval = setInterval(async () => {
    try {
      const pipeline = await pipelineOrchestrator.getPipeline(id);
      if (pipeline) {
        sendEvent("status", {
          status: pipeline.status,
          phase: pipeline.currentPhase,
          phases: pipeline.phases,
          budget: pipeline.budget,
          correlationId: pipeline.correlationId,
        });
      }
    } catch {}
  }, 5000);

  const initialPipeline = await pipelineOrchestrator.getPipeline(id);
  if (initialPipeline) {
    sendEvent("status", {
      status: initialPipeline.status,
      phase: initialPipeline.currentPhase,
      phases: initialPipeline.phases,
      budget: initialPipeline.budget,
      correlationId: initialPipeline.correlationId,
    });
  }

  req.on("close", () => {
    clearInterval(pollInterval);
    pipelineOrchestrator.off("pipeline:phase_started", onPhaseStarted);
    pipelineOrchestrator.off("pipeline:phase_completed", onPhaseCompleted);
    pipelineOrchestrator.off("pipeline:staging_ready", onStagingReady);
    pipelineOrchestrator.off("pipeline:completed", onCompleted);
    pipelineOrchestrator.off("pipeline:failed", onFailed);
    pipelineOrchestrator.off("pipeline:rolled_back", onRolledBack);
  });
});

export default router;
