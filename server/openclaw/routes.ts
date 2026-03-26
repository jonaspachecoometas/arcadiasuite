/**
 * OpenClaw Routes — Fase 4
 *
 * GET  /api/openclaw/suggestions          — lista sugestões pendentes
 * POST /api/openclaw/suggestions/:id/accept — aceita sugestão (publica DRAFT)
 * POST /api/openclaw/suggestions/:id/reject — rejeita sugestão
 * GET  /api/openclaw/patterns             — lista padrões detectados
 */

import type { Express, Request, Response } from "express";
import { db } from "../../db/index";
import { arcadiaSkills, detectedPatterns, skillSuggestions } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export function registerOpenClawRoutes(app: Express): void {

  // ── Listar sugestões pendentes ──────────────────────────────────────────────
  app.get("/api/openclaw/suggestions", async (req: Request, res: Response) => {
    try {
      const suggestions = await db
        .select()
        .from(skillSuggestions)
        .where(eq(skillSuggestions.status, "pending"))
        .orderBy(desc(skillSuggestions.createdAt))
        .limit(50);

      // Enriquecer com body do DRAFT
      const enriched = await Promise.all(
        suggestions.map(async (s) => {
          let draftBody: string | null = null;
          if (s.generatedSkillId) {
            const [draft] = await db
              .select({ body: arcadiaSkills.body, name: arcadiaSkills.name })
              .from(arcadiaSkills)
              .where(eq(arcadiaSkills.id, s.generatedSkillId))
              .limit(1);
            draftBody = draft?.body ?? null;
          }
          return { ...s, draftBody };
        })
      );

      res.json({ suggestions: enriched, total: enriched.length });
    } catch (err) {
      res.status(500).json({ error: "Erro ao listar sugestões" });
    }
  });

  // ── Aceitar sugestão ────────────────────────────────────────────────────────
  app.post("/api/openclaw/suggestions/:id/accept", async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?.id ?? null;

    try {
      const [suggestion] = await db
        .select()
        .from(skillSuggestions)
        .where(and(eq(skillSuggestions.id, id), eq(skillSuggestions.status, "pending")))
        .limit(1);

      if (!suggestion) {
        return res.status(404).json({ error: "Sugestão não encontrada" });
      }

      // Publica o DRAFT
      if (suggestion.generatedSkillId) {
        await db
          .update(arcadiaSkills)
          .set({ status: "active", updatedAt: new Date() })
          .where(eq(arcadiaSkills.id, suggestion.generatedSkillId));
      }

      // Atualiza sugestão e padrão
      await db
        .update(skillSuggestions)
        .set({ status: "accepted", reviewedBy: userId, reviewedAt: new Date(), updatedAt: new Date() })
        .where(eq(skillSuggestions.id, id));

      if (suggestion.patternId) {
        await db
          .update(detectedPatterns)
          .set({ status: "converted", updatedAt: new Date() })
          .where(eq(detectedPatterns.id, suggestion.patternId));
      }

      res.json({ ok: true, skillId: suggestion.generatedSkillId });
    } catch (err) {
      res.status(500).json({ error: "Erro ao aceitar sugestão" });
    }
  });

  // ── Rejeitar sugestão ───────────────────────────────────────────────────────
  app.post("/api/openclaw/suggestions/:id/reject", async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?.id ?? null;

    try {
      const [suggestion] = await db
        .select()
        .from(skillSuggestions)
        .where(and(eq(skillSuggestions.id, id), eq(skillSuggestions.status, "pending")))
        .limit(1);

      if (!suggestion) {
        return res.status(404).json({ error: "Sugestão não encontrada" });
      }

      // Remove o DRAFT
      if (suggestion.generatedSkillId) {
        await db
          .update(arcadiaSkills)
          .set({ status: "archived", updatedAt: new Date() })
          .where(eq(arcadiaSkills.id, suggestion.generatedSkillId));
      }

      await db
        .update(skillSuggestions)
        .set({ status: "rejected", reviewedBy: userId, reviewedAt: new Date(), updatedAt: new Date() })
        .where(eq(skillSuggestions.id, id));

      if (suggestion.patternId) {
        await db
          .update(detectedPatterns)
          .set({ status: "archived", updatedAt: new Date() })
          .where(eq(detectedPatterns.id, suggestion.patternId));
      }

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Erro ao rejeitar sugestão" });
    }
  });

  // ── Listar padrões detectados ───────────────────────────────────────────────
  app.get("/api/openclaw/patterns", async (_req: Request, res: Response) => {
    try {
      const patterns = await db
        .select()
        .from(detectedPatterns)
        .where(eq(detectedPatterns.status, "active"))
        .orderBy(desc(detectedPatterns.updatedAt))
        .limit(100);

      res.json({ patterns, total: patterns.length });
    } catch (err) {
      res.status(500).json({ error: "Erro ao listar padrões" });
    }
  });
}
