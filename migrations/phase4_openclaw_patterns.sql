-- Phase 4: OpenClaw — Tabelas de detecção de padrões e sugestões de skills emergentes
-- Executar se as tabelas ainda não existirem (schema já definido em shared/schema.ts)

CREATE TABLE IF NOT EXISTS detected_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id INTEGER REFERENCES tenants(id),
  user_id VARCHAR REFERENCES users(id),
  action_type VARCHAR(100) NOT NULL,
  description TEXT,
  frequency INTEGER NOT NULL DEFAULT 0,
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0,
  first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skill_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID REFERENCES detected_patterns(id) ON DELETE CASCADE,
  tenant_id INTEGER REFERENCES tenants(id),
  user_id VARCHAR REFERENCES users(id),
  suggested_skill_name VARCHAR(200) NOT NULL,
  suggested_description TEXT,
  estimated_automation TEXT,
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0,
  generated_skill_id UUID REFERENCES arcadia_skills(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  source VARCHAR(50) NOT NULL DEFAULT 'openclaw',
  reviewed_by VARCHAR REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_detected_patterns_status ON detected_patterns(status);
CREATE INDEX IF NOT EXISTS idx_detected_patterns_user ON detected_patterns(user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_skill_suggestions_status ON skill_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_skill_suggestions_pattern ON skill_suggestions(pattern_id);
