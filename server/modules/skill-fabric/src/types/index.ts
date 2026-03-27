// server/modules/skill-fabric/src/types/index.ts
// Types for the Skill Fabric module

import type { Skill, SkillExecution } from "@shared/schema";

// Re-export base types for convenience
export type { Skill, SkillExecution };

// ── Compilation ──────────────────────────────────────────────────────────────

export type SkillMode = "code" | "markdown" | "visual";

export interface CompileInput {
  mode: SkillMode;
  source: string;
  name?: string;
  slug?: string;
}

export interface CompileResult {
  ok: boolean;
  body?: string;
  errors?: CompileError[];
  warnings?: string[];
  metadata?: Record<string, unknown>;
}

export interface CompileError {
  line?: number;
  column?: number;
  message: string;
  severity: "error" | "warning";
}

// ── Validation ────────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
}

// ── Execution ─────────────────────────────────────────────────────────────────

export interface FabricExecuteOptions {
  skillId: string;
  parameters?: Record<string, unknown>;
  tenantId?: number;
  userId?: string;
  timeout?: number; // ms, default 5000
}

export interface FabricExecuteResult {
  ok: boolean;
  data?: unknown;
  error?: string;
  durationMs: number;
  executionId: string;
  logs?: string[];
}

// ── Sandbox ───────────────────────────────────────────────────────────────────

export interface SandboxOptions {
  code: string;
  context?: Record<string, unknown>;
  timeout?: number; // ms
}

export interface SandboxResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  logs: string[];
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

export type LifecycleStatus = "draft" | "active" | "archived";

export interface LifecycleTransition {
  from: LifecycleStatus;
  to: LifecycleStatus;
  reason?: string;
  userId?: string;
}

// ── API ───────────────────────────────────────────────────────────────────────

export interface CreateSkillFabricDto {
  name: string;
  slug: string;
  namespace?: string;
  description?: string;
  mode: SkillMode;
  source: string;
  tags?: string[];
  parametersSchema?: Record<string, unknown>;
  returnSchema?: Record<string, unknown>;
  version?: string;
}

export interface UpdateSkillFabricDto {
  name?: string;
  description?: string;
  mode?: SkillMode;
  source?: string;
  tags?: string[];
  parametersSchema?: Record<string, unknown>;
  returnSchema?: Record<string, unknown>;
  version?: string;
}
