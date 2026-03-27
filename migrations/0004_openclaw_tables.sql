-- Migration 0004: OpenClaw — Detecção de Padrões e Sugestões de Skills Emergentes
-- Fase 4 do planejamento estratégico Arcádia Agentic Suite

-- Tabela de padrões detectados
CREATE TABLE IF NOT EXISTS "detected_patterns" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" INTEGER REFERENCES "tenants"("id"),
  "user_id" VARCHAR REFERENCES "users"("id"),

  -- Padrão detectado
  "action_type" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "frequency" INTEGER NOT NULL DEFAULT 0,
  "confidence" NUMERIC(4, 3) NOT NULL DEFAULT '0',

  -- Janela de análise
  "first_seen_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Metadados do padrão (contexto, módulos envolvidos, etc.)
  "metadata" JSONB DEFAULT '{}',

  -- Ciclo de vida: active | archived | converted
  "status" VARCHAR(20) NOT NULL DEFAULT 'active',

  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "detected_patterns_tenant_user_idx"
  ON "detected_patterns"("tenant_id", "user_id");

CREATE INDEX IF NOT EXISTS "detected_patterns_action_type_idx"
  ON "detected_patterns"("action_type");

CREATE INDEX IF NOT EXISTS "detected_patterns_status_idx"
  ON "detected_patterns"("status");

-- Tabela de sugestões de skills emergentes
CREATE TABLE IF NOT EXISTS "skill_suggestions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "pattern_id" UUID REFERENCES "detected_patterns"("id") ON DELETE CASCADE,
  "tenant_id" INTEGER REFERENCES "tenants"("id"),
  "user_id" VARCHAR REFERENCES "users"("id"),

  -- Skill sugerida
  "suggested_skill_name" VARCHAR(200) NOT NULL,
  "suggested_description" TEXT,
  "estimated_automation" TEXT,
  "confidence" NUMERIC(4, 3) NOT NULL DEFAULT '0',

  -- Skill gerada (após confirmação)
  "generated_skill_id" UUID REFERENCES "skills"("id"),

  -- Estado da sugestão: pending | accepted | rejected | expired
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',

  -- Rastreabilidade
  "source" VARCHAR(50) NOT NULL DEFAULT 'openclaw',
  "reviewed_by" VARCHAR REFERENCES "users"("id"),
  "reviewed_at" TIMESTAMP,

  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "skill_suggestions_pattern_id_idx"
  ON "skill_suggestions"("pattern_id");

CREATE INDEX IF NOT EXISTS "skill_suggestions_tenant_user_idx"
  ON "skill_suggestions"("tenant_id", "user_id");

CREATE INDEX IF NOT EXISTS "skill_suggestions_status_idx"
  ON "skill_suggestions"("status");
