-- MiroFlow Generated Dashboards
-- Rastreia dashboards criados pelo MiroFlow baseado em análises

CREATE TABLE IF NOT EXISTS miroflow_generated_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Análise que criou este dashboard
  analysis_id VARCHAR(255),
  agent VARCHAR(50) NOT NULL CHECK (agent IN ('statistician', 'fiscal_auditor', 'researcher')),
  task TEXT NOT NULL,
  insights JSONB,

  -- Dashboard no Superset
  dashboard_id INT NOT NULL,
  dashboard_title VARCHAR(255) NOT NULL,
  dataset_name VARCHAR(255),

  -- SQL sugerido/criado
  sql_query TEXT,

  -- Auditoria
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tenant_id INT,

  -- Referência
  superset_url VARCHAR(512),

  -- Soft delete
  deleted_at TIMESTAMP,

  -- Constraints
  CONSTRAINT unique_analysis_dashboard UNIQUE (analysis_id, dashboard_id) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_miroflow_dashboards_analysis ON miroflow_generated_dashboards(analysis_id);
CREATE INDEX idx_miroflow_dashboards_created_at ON miroflow_generated_dashboards(created_at DESC);
CREATE INDEX idx_miroflow_dashboards_dashboard_id ON miroflow_generated_dashboards(dashboard_id);
CREATE INDEX idx_miroflow_dashboards_tenant ON miroflow_generated_dashboards(tenant_id);
