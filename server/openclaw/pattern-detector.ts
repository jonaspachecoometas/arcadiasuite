/**
 * PatternDetector — OpenClaw Phase 4
 *
 * Analisa skill_executions a cada hora, detecta padrões por (skillId + userId),
 * e gera DRAFT skills emergentes via llama3.1:8b quando threshold atingido.
 *
 * Thresholds: min 3 execuções, janela 30 dias, confiança ≥ 0.80
 */

import crypto from "crypto";
import OpenAI from "openai";
import { db } from "../../db/index";
import {
  arcadiaSkills,
  skillExecutions,
  detectedPatterns,
  skillSuggestions,
} from "@shared/schema";
import { eq, and, gte, sql, count } from "drizzle-orm";

const MIN_FREQUENCY = 3;
const WINDOW_DAYS = 30;
const MIN_CONFIDENCE = 0.80;
const CRON_INTERVAL_MS = 60 * 60 * 1000; // 1 hora

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// ─── Análise de padrões ────────────────────────────────────────────────────────

async function detectPatterns(): Promise<void> {
  const windowStart = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Agrupa execuções bem-sucedidas por skillId + userId na janela
  const grouped = await db
    .select({
      skillId: skillExecutions.skillId,
      userId: skillExecutions.userId,
      tenantId: skillExecutions.tenantId,
      execCount: count(skillExecutions.id),
      firstSeen: sql<Date>`MIN(${skillExecutions.startedAt})`,
      lastSeen: sql<Date>`MAX(${skillExecutions.startedAt})`,
    })
    .from(skillExecutions)
    .where(
      and(
        gte(skillExecutions.startedAt, windowStart),
        eq(skillExecutions.status, "success")
      )
    )
    .groupBy(skillExecutions.skillId, skillExecutions.userId, skillExecutions.tenantId);

  // Frequência máxima no período (para normalizar confiança)
  const maxFreq = grouped.reduce((m, r) => Math.max(m, Number(r.execCount)), 1);

  for (const row of grouped) {
    const frequency = Number(row.execCount);
    if (frequency < MIN_FREQUENCY) continue;

    const confidence = Math.min(frequency / maxFreq, 1);
    if (confidence < MIN_CONFIDENCE) continue;

    // Busca skill para obter nome
    const [skill] = await db
      .select({ name: arcadiaSkills.name, slug: arcadiaSkills.slug, description: arcadiaSkills.description })
      .from(arcadiaSkills)
      .where(eq(arcadiaSkills.id, row.skillId))
      .limit(1);

    if (!skill) continue;

    const actionType = `skill:${skill.slug}`;

    // Upsert em detected_patterns
    const existing = await db
      .select({ id: detectedPatterns.id })
      .from(detectedPatterns)
      .where(
        and(
          eq(detectedPatterns.actionType, actionType),
          eq(detectedPatterns.userId, row.userId ?? "")
        )
      )
      .limit(1);

    let patternId: string;

    if (existing.length > 0) {
      patternId = existing[0].id;
      await db
        .update(detectedPatterns)
        .set({
          frequency,
          confidence: String(confidence.toFixed(3)),
          lastSeenAt: row.lastSeen,
          updatedAt: new Date(),
        })
        .where(eq(detectedPatterns.id, patternId));
    } else {
      const [created] = await db
        .insert(detectedPatterns)
        .values({
          tenantId: row.tenantId,
          userId: row.userId,
          actionType,
          description: `Skill "${skill.name}" executada repetidamente`,
          frequency,
          confidence: String(confidence.toFixed(3)),
          firstSeenAt: row.firstSeen,
          lastSeenAt: row.lastSeen,
          metadata: { skillId: row.skillId, skillName: skill.name },
          status: "active",
        })
        .returning({ id: detectedPatterns.id });
      patternId = created.id;
    }

    // Cria sugestão se ainda não existe sugestão pendente para este padrão
    const existingSuggestion = await db
      .select({ id: skillSuggestions.id })
      .from(skillSuggestions)
      .where(
        and(
          eq(skillSuggestions.patternId, patternId),
          eq(skillSuggestions.status, "pending")
        )
      )
      .limit(1);

    if (existingSuggestion.length === 0) {
      await createEmergentSkillDraft(patternId, skill, frequency, confidence, row.tenantId, row.userId);
    }
  }
}

// ─── Geração de DRAFT via AI ───────────────────────────────────────────────────

async function createEmergentSkillDraft(
  patternId: string,
  skill: { name: string; slug: string; description: string | null },
  frequency: number,
  confidence: number,
  tenantId: number | null,
  userId: string | null
): Promise<void> {
  const prompt = `Você é um assistente de automação. Um usuário executou a skill "${skill.name}" (${skill.description ?? "sem descrição"}) ${frequency} vezes nos últimos 30 dias.

Gere um corpo (body) em Markdown para uma nova skill chamada "Auto: ${skill.name}" que automatize este fluxo de forma mais inteligente.
O body deve usar blocos /skill/${skill.slug} para reutilizar a skill original e adicionar lógica de orquestração.
Responda apenas com o body em Markdown, sem explicações.`;

  let body = `# Auto: ${skill.name}\n\nEsta skill emergiu de ${frequency} execuções detectadas.\n\n\`\`\`\n/skill/${skill.slug}\n\`\`\`\n`;

  try {
    const completion = await openai.chat.completions.create({
      model: "llama3.1:8b",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 512,
      temperature: 0.4,
    });
    const generated = completion.choices[0]?.message?.content?.trim();
    if (generated) body = generated;
  } catch {
    // AI indisponível — usa body padrão
  }

  // Cria DRAFT skill
  const draftSlug = `auto-${skill.slug}-${crypto.randomBytes(4).toString("hex")}`;
  const [draftSkill] = await db
    .insert(arcadiaSkills)
    .values({
      name: `Auto: ${skill.name}`,
      slug: draftSlug,
      description: `Skill emergente detectada automaticamente. Executada ${frequency} vezes com confiança ${(confidence * 100).toFixed(0)}%.`,
      body,
      status: "draft",
      namespace: "tenant",
      tenantId,
      userId,
      tags: ["emergente", "openclaw"],
      author: "openclaw",
    })
    .returning({ id: arcadiaSkills.id });

  // Registra sugestão
  await db.insert(skillSuggestions).values({
    patternId,
    tenantId,
    userId,
    suggestedSkillName: `Auto: ${skill.name}`,
    suggestedDescription: `Automatização detectada com base em ${frequency} execuções.`,
    estimatedAutomation: body,
    confidence: String(confidence.toFixed(3)),
    generatedSkillId: draftSkill.id,
    status: "pending",
    source: "openclaw",
  });
}

// ─── Inicialização do cron ─────────────────────────────────────────────────────

let cronHandle: ReturnType<typeof setInterval> | null = null;

export function startPatternDetector(): void {
  if (cronHandle) return;

  // Executa imediatamente na inicialização, depois a cada hora
  detectPatterns().catch(console.error);
  cronHandle = setInterval(() => {
    detectPatterns().catch(console.error);
  }, CRON_INTERVAL_MS);

  console.log("[OpenClaw] PatternDetector iniciado (intervalo: 1h)");
}

export function stopPatternDetector(): void {
  if (cronHandle) {
    clearInterval(cronHandle);
    cronHandle = null;
  }
}
