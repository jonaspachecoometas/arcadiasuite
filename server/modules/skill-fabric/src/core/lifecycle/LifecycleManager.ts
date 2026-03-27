// server/modules/skill-fabric/src/core/lifecycle/LifecycleManager.ts
// Manages skill lifecycle transitions: draft → active → archived

import { db } from "../../../../../../db";
import { skills } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { LifecycleStatus, LifecycleTransition } from "../../types";

const ALLOWED_TRANSITIONS: Record<LifecycleStatus, LifecycleStatus[]> = {
  draft: ["active", "archived"],
  active: ["archived"],
  archived: [], // archived is terminal
};

export class LifecycleManager {
  /** Returns whether a transition is allowed */
  canTransition(from: LifecycleStatus, to: LifecycleStatus): boolean {
    return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
  }

  /** Apply a lifecycle transition to a skill in the DB */
  async transition(skillId: string, transition: LifecycleTransition): Promise<{ ok: boolean; error?: string }> {
    const { from, to } = transition;

    if (!this.canTransition(from, to)) {
      return { ok: false, error: `Transição inválida: ${from} → ${to}. Permitidas: ${ALLOWED_TRANSITIONS[from]?.join(", ") || "nenhuma"}` };
    }

    // Verify current status matches "from"
    const [current] = await db.select({ status: skills.status }).from(skills).where(eq(skills.id, skillId)).limit(1);
    if (!current) {
      return { ok: false, error: `Skill não encontrada: ${skillId}` };
    }

    if (current.status !== from) {
      return { ok: false, error: `Status atual é '${current.status}', esperado '${from}'` };
    }

    await db.update(skills)
      .set({ status: to, updatedAt: new Date() })
      .where(eq(skills.id, skillId));

    return { ok: true };
  }

  /** Convenience: publish a draft skill */
  async publish(skillId: string, userId?: string): Promise<{ ok: boolean; error?: string }> {
    return this.transition(skillId, { from: "draft", to: "active", userId });
  }

  /** Convenience: archive an active or draft skill */
  async archive(skillId: string, userId?: string): Promise<{ ok: boolean; error?: string }> {
    // Try active → archived first, then draft → archived
    const [current] = await db.select({ status: skills.status }).from(skills).where(eq(skills.id, skillId)).limit(1);
    if (!current) {
      return { ok: false, error: `Skill não encontrada: ${skillId}` };
    }

    const from = current.status as LifecycleStatus;
    if (!this.canTransition(from, "archived")) {
      return { ok: false, error: `Não é possível arquivar uma skill com status '${from}'` };
    }

    return this.transition(skillId, { from, to: "archived", userId });
  }

  /** Bump version (patch) and optionally transition to draft for re-editing */
  async bumpVersion(skillId: string): Promise<{ ok: boolean; version?: string; error?: string }> {
    const [current] = await db.select({ version: skills.version, status: skills.status }).from(skills)
      .where(eq(skills.id, skillId)).limit(1);
    if (!current) {
      return { ok: false, error: `Skill não encontrada: ${skillId}` };
    }

    const parts = current.version.split(".").map(Number);
    if (parts.length !== 3) {
      return { ok: false, error: `Versão malformada: ${current.version}` };
    }
    parts[2] += 1;
    const nextVersion = parts.join(".");

    await db.update(skills)
      .set({ version: nextVersion, updatedAt: new Date() })
      .where(eq(skills.id, skillId));

    return { ok: true, version: nextVersion };
  }
}

export const lifecycleManager = new LifecycleManager();
