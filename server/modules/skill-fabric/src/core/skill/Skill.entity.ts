// server/modules/skill-fabric/src/core/skill/Skill.entity.ts
// Skill entity — wraps the DB row with domain logic

import type { Skill } from "../../types";

export class SkillEntity {
  private readonly data: Skill;

  constructor(data: Skill) {
    this.data = data;
  }

  get id(): string { return this.data.id; }
  get name(): string { return this.data.name; }
  get slug(): string { return this.data.slug; }
  get namespace(): string { return this.data.namespace; }
  get version(): string { return this.data.version; }
  get body(): string | null { return this.data.body ?? null; }
  get status(): string { return this.data.status; }
  get tags(): string[] { return this.data.tags ?? []; }
  get tenantId(): number | null { return this.data.tenantId ?? null; }
  get parametersSchema(): Record<string, unknown> {
    return (this.data.parametersSchema as Record<string, unknown>) ?? {};
  }

  isActive(): boolean {
    return this.data.status === "active";
  }

  isDraft(): boolean {
    return this.data.status === "draft";
  }

  isArchived(): boolean {
    return this.data.status === "archived";
  }

  isCodeSkill(): boolean {
    // Code skills have a body that starts with a function or JS code marker
    const body = this.data.body ?? "";
    return body.trimStart().startsWith("//code") || body.trimStart().startsWith("function") || body.trimStart().startsWith("async");
  }

  isMarkdownSkill(): boolean {
    return !this.isCodeSkill();
  }

  /** Increment the patch version (e.g. 1.0.0 → 1.0.1) */
  nextPatchVersion(): string {
    const parts = this.data.version.split(".").map(Number);
    if (parts.length !== 3) return "1.0.1";
    parts[2] += 1;
    return parts.join(".");
  }

  toJSON(): Skill {
    return { ...this.data };
  }
}
