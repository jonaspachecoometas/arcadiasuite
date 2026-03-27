-- Phase 6: Agent Definitions (Dev Center — Fábrica de Agentes)
-- Creates arcadia_agent_defs table for Design → Assemble → Deploy workflow

CREATE TABLE IF NOT EXISTS arcadia_agent_defs (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR,
  user_id VARCHAR REFERENCES users(id),

  name VARCHAR(200) NOT NULL,
  description TEXT,

  -- spec: { mode: "markdown" | "typescript" | "visual", content: string }
  spec JSONB NOT NULL DEFAULT '{}',

  -- draft | assembling | ready | deployed
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,

  -- FK para blackboard_tasks (nullable)
  last_task_id INTEGER,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_defs_tenant ON arcadia_agent_defs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_defs_status ON arcadia_agent_defs(status);
CREATE INDEX IF NOT EXISTS idx_agent_defs_user ON arcadia_agent_defs(user_id);
