-- Migration 0003: Agentic Suite — Skills (POO) + Skill Executions
-- Fase 1 do planejamento estratégico Arcádia Agentic Suite

CREATE TABLE IF NOT EXISTS "skills" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" INTEGER,
  "company_id" INTEGER,
  "user_id" VARCHAR,
  "name" VARCHAR(255) NOT NULL,
  "slug" VARCHAR(255) NOT NULL,
  "namespace" VARCHAR(20) NOT NULL DEFAULT 'tenant',
  "description" TEXT,
  "version" VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  "tags" TEXT[] DEFAULT '{}',
  "extends" TEXT[] DEFAULT '{}',
  "implements" TEXT[] DEFAULT '{}',
  "dependencies" JSONB DEFAULT '[]',
  "execute_visibility" VARCHAR(20) DEFAULT 'public',
  "parameters_visibility" VARCHAR(20) DEFAULT 'public',
  "trigger_type" VARCHAR(30),
  "trigger_config" JSONB,
  "parameters_schema" JSONB DEFAULT '{}',
  "return_schema" JSONB DEFAULT '{}',
  "body" TEXT,
  "status" VARCHAR(20) NOT NULL DEFAULT 'active',
  "is_system" BOOLEAN DEFAULT false,
  "created_by" VARCHAR,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índice único: mesmo slug não pode repetir dentro do mesmo tenant
CREATE UNIQUE INDEX IF NOT EXISTS "skills_tenant_slug_idx"
  ON "skills"("tenant_id", "slug")
  WHERE "tenant_id" IS NOT NULL;

-- Skills de sistema (sem tenant) também precisam slug único
CREATE UNIQUE INDEX IF NOT EXISTS "skills_system_slug_idx"
  ON "skills"("slug")
  WHERE "tenant_id" IS NULL AND "is_system" = true;

CREATE TABLE IF NOT EXISTS "skill_executions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "skill_id" UUID NOT NULL REFERENCES "skills"("id") ON DELETE CASCADE,
  "tenant_id" INTEGER,
  "triggered_by" VARCHAR(30) NOT NULL DEFAULT 'manual',
  "triggered_by_user_id" VARCHAR,
  "triggered_by_agent_id" VARCHAR(100),
  "parameters" JSONB DEFAULT '{}',
  "result" JSONB,
  "error" TEXT,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "duration_ms" INTEGER,
  "steps_count" INTEGER DEFAULT 0,
  "correlation_id" UUID DEFAULT gen_random_uuid(),
  "audit_hash" VARCHAR(64),
  "started_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "skill_executions_skill_id_idx" ON "skill_executions"("skill_id");
CREATE INDEX IF NOT EXISTS "skill_executions_tenant_id_idx" ON "skill_executions"("tenant_id");
CREATE INDEX IF NOT EXISTS "skill_executions_started_at_idx" ON "skill_executions"("started_at" DESC);
