-- Migration 001: Enable Row Level Security (RLS) on tenant-isolated tables
-- Data: 2026-04-02
-- Description: Habilita RLS em todas as tabelas que possuem tenant_id

-- ==========================================
-- PRODUCTIVITY & WORKSPACE
-- ==========================================

ALTER TABLE "workspace_pages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quick_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activity_feed" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "knowledge_base" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_threads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "manus_runs" ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- LOW-CODE / DEV CENTER
-- ==========================================

ALTER TABLE "arc_doctypes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "arc_layouts" ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- MULTI-TENANCY CORE
-- ==========================================

ALTER TABLE "tenant_empresas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "partner_clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "partner_commissions" ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- PROCESS COMPASS
-- ==========================================

ALTER TABLE "pc_clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pc_projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pc_crm_stages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pc_crm_leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pc_crm_opportunities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pc_crm_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pc_pdca_cycles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pc_requirements" ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- CRM EXPANDIDO
-- ==========================================

ALTER TABLE "crm_partners" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_contracts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_channels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_threads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_quick_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_pipeline_stages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_opportunities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_proposals" ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- LOG DE TABELAS COM RLS ATIVADO
-- ==========================================

COMMENT ON TABLE "workspace_pages" IS 'RLS habilitado - isolamento por tenant';
COMMENT ON TABLE "quick_notes" IS 'RLS habilitado - isolamento por tenant';
COMMENT ON TABLE "activity_feed" IS 'RLS habilitado - isolamento por tenant';
COMMENT ON TABLE "conversations" IS 'RLS habilitado - isolamento por tenant';
COMMENT ON TABLE "knowledge_base" IS 'RLS habilitado - isolamento por tenant';
COMMENT ON TABLE "chat_threads" IS 'RLS habilitado - isolamento por tenant';
COMMENT ON TABLE "manus_runs" IS 'RLS habilitado - isolamento por tenant';
COMMENT ON TABLE "tenant_empresas" IS 'RLS habilitado - isolamento por tenant';
COMMENT ON TABLE "tenant_users" IS 'RLS habilitado - isolamento por tenant';
COMMENT ON TABLE "pc_clients" IS 'RLS habilitado - isolamento por tenant';
COMMENT ON TABLE "pc_projects" IS 'RLS habilitado - isolamento por tenant';
COMMENT ON TABLE "crm_clients" IS 'RLS habilitado - isolamento por tenant';
COMMENT ON TABLE "crm_leads" IS 'RLS habilitado - isolamento por tenant';
COMMENT ON TABLE "crm_opportunities" IS 'RLS habilitado - isolamento por tenant';
