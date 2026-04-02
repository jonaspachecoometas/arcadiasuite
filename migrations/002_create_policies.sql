-- Migration 002: Create RLS Policies for tenant isolation
-- Data: 2026-04-02
-- Description: Cria políticas RLS para isolamento de dados por tenant

-- ==========================================
-- FUNÇÃO AUXILIAR: Obter tenant atual do usuário
-- ==========================================

CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS INTEGER AS $$
DECLARE
    tenant_id INTEGER;
BEGIN
    -- Obtém tenant_id do contexto da aplicação (setado via application_name ou custom config)
    -- Ou busca pelo user_id da sessão atual
    BEGIN
        tenant_id := current_setting('app.current_tenant_id', true)::INTEGER;
    EXCEPTION WHEN OTHERS THEN
        tenant_id := NULL;
    END;
    
    RETURN tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- FUNÇÃO: Verificar se usuário é admin/master
-- ==========================================

CREATE OR REPLACE FUNCTION is_tenant_admin()
RETURNS BOOLEAN AS $$
DECLARE
    is_admin BOOLEAN;
    tenant_role TEXT;
BEGIN
    BEGIN
        tenant_role := current_setting('app.current_tenant_role', true);
        is_admin := (tenant_role = 'owner' OR tenant_role = 'admin');
    EXCEPTION WHEN OTHERS THEN
        is_admin := FALSE;
    END;
    
    RETURN is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- PRODUCTIVITY & WORKSPACE
-- ==========================================

-- workspace_pages policies
DROP POLICY IF EXISTS workspace_pages_tenant_select ON "workspace_pages";
DROP POLICY IF EXISTS workspace_pages_tenant_insert ON "workspace_pages";
DROP POLICY IF EXISTS workspace_pages_tenant_update ON "workspace_pages";
DROP POLICY IF EXISTS workspace_pages_tenant_delete ON "workspace_pages";

CREATE POLICY workspace_pages_tenant_select ON "workspace_pages"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY workspace_pages_tenant_insert ON "workspace_pages"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY workspace_pages_tenant_update ON "workspace_pages"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY workspace_pages_tenant_delete ON "workspace_pages"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- quick_notes policies
DROP POLICY IF EXISTS quick_notes_tenant_select ON "quick_notes";
DROP POLICY IF EXISTS quick_notes_tenant_insert ON "quick_notes";
DROP POLICY IF EXISTS quick_notes_tenant_update ON "quick_notes";
DROP POLICY IF EXISTS quick_notes_tenant_delete ON "quick_notes";

CREATE POLICY quick_notes_tenant_select ON "quick_notes"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY quick_notes_tenant_insert ON "quick_notes"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY quick_notes_tenant_update ON "quick_notes"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY quick_notes_tenant_delete ON "quick_notes"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- activity_feed policies
DROP POLICY IF EXISTS activity_feed_tenant_select ON "activity_feed";
DROP POLICY IF EXISTS activity_feed_tenant_insert ON "activity_feed";
DROP POLICY IF EXISTS activity_feed_tenant_update ON "activity_feed";
DROP POLICY IF EXISTS activity_feed_tenant_delete ON "activity_feed";

CREATE POLICY activity_feed_tenant_select ON "activity_feed"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY activity_feed_tenant_insert ON "activity_feed"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY activity_feed_tenant_update ON "activity_feed"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY activity_feed_tenant_delete ON "activity_feed"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- conversations policies
DROP POLICY IF EXISTS conversations_tenant_select ON "conversations";
DROP POLICY IF EXISTS conversations_tenant_insert ON "conversations";
DROP POLICY IF EXISTS conversations_tenant_update ON "conversations";
DROP POLICY IF EXISTS conversations_tenant_delete ON "conversations";

CREATE POLICY conversations_tenant_select ON "conversations"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY conversations_tenant_insert ON "conversations"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY conversations_tenant_update ON "conversations"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY conversations_tenant_delete ON "conversations"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- knowledge_base policies
DROP POLICY IF EXISTS knowledge_base_tenant_select ON "knowledge_base";
DROP POLICY IF EXISTS knowledge_base_tenant_insert ON "knowledge_base";
DROP POLICY IF EXISTS knowledge_base_tenant_update ON "knowledge_base";
DROP POLICY IF EXISTS knowledge_base_tenant_delete ON "knowledge_base";

CREATE POLICY knowledge_base_tenant_select ON "knowledge_base"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY knowledge_base_tenant_insert ON "knowledge_base"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY knowledge_base_tenant_update ON "knowledge_base"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY knowledge_base_tenant_delete ON "knowledge_base"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- chat_threads policies
DROP POLICY IF EXISTS chat_threads_tenant_select ON "chat_threads";
DROP POLICY IF EXISTS chat_threads_tenant_insert ON "chat_threads";
DROP POLICY IF EXISTS chat_threads_tenant_update ON "chat_threads";
DROP POLICY IF EXISTS chat_threads_tenant_delete ON "chat_threads";

CREATE POLICY chat_threads_tenant_select ON "chat_threads"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY chat_threads_tenant_insert ON "chat_threads"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY chat_threads_tenant_update ON "chat_threads"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY chat_threads_tenant_delete ON "chat_threads"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- manus_runs policies
DROP POLICY IF EXISTS manus_runs_tenant_select ON "manus_runs";
DROP POLICY IF EXISTS manus_runs_tenant_insert ON "manus_runs";
DROP POLICY IF EXISTS manus_runs_tenant_update ON "manus_runs";
DROP POLICY IF EXISTS manus_runs_tenant_delete ON "manus_runs";

CREATE POLICY manus_runs_tenant_select ON "manus_runs"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY manus_runs_tenant_insert ON "manus_runs"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY manus_runs_tenant_update ON "manus_runs"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY manus_runs_tenant_delete ON "manus_runs"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- ==========================================
-- LOW-CODE / DEV CENTER
-- ==========================================

-- arc_doctypes policies
DROP POLICY IF EXISTS arc_doctypes_tenant_select ON "arc_doctypes";
DROP POLICY IF EXISTS arc_doctypes_tenant_insert ON "arc_doctypes";
DROP POLICY IF EXISTS arc_doctypes_tenant_update ON "arc_doctypes";
DROP POLICY IF EXISTS arc_doctypes_tenant_delete ON "arc_doctypes";

CREATE POLICY arc_doctypes_tenant_select ON "arc_doctypes"
    FOR SELECT USING (tenant_id = get_current_tenant_id() OR tenant_id IS NULL);

CREATE POLICY arc_doctypes_tenant_insert ON "arc_doctypes"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY arc_doctypes_tenant_update ON "arc_doctypes"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY arc_doctypes_tenant_delete ON "arc_doctypes"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- arc_layouts policies
DROP POLICY IF EXISTS arc_layouts_tenant_select ON "arc_layouts";
DROP POLICY IF EXISTS arc_layouts_tenant_insert ON "arc_layouts";
DROP POLICY IF EXISTS arc_layouts_tenant_update ON "arc_layouts";
DROP POLICY IF EXISTS arc_layouts_tenant_delete ON "arc_layouts";

CREATE POLICY arc_layouts_tenant_select ON "arc_layouts"
    FOR SELECT USING (tenant_id = get_current_tenant_id() OR tenant_id IS NULL);

CREATE POLICY arc_layouts_tenant_insert ON "arc_layouts"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY arc_layouts_tenant_update ON "arc_layouts"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY arc_layouts_tenant_delete ON "arc_layouts"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- ==========================================
-- MULTI-TENANCY CORE
-- ==========================================

-- tenant_empresas policies
DROP POLICY IF EXISTS tenant_empresas_tenant_select ON "tenant_empresas";
DROP POLICY IF EXISTS tenant_empresas_tenant_insert ON "tenant_empresas";
DROP POLICY IF EXISTS tenant_empresas_tenant_update ON "tenant_empresas";
DROP POLICY IF EXISTS tenant_empresas_tenant_delete ON "tenant_empresas";

CREATE POLICY tenant_empresas_tenant_select ON "tenant_empresas"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_empresas_tenant_insert ON "tenant_empresas"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_empresas_tenant_update ON "tenant_empresas"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_empresas_tenant_delete ON "tenant_empresas"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- tenant_users policies (tabela de junção - verifica se user pertence ao tenant)
DROP POLICY IF EXISTS tenant_users_tenant_select ON "tenant_users";
DROP POLICY IF EXISTS tenant_users_tenant_insert ON "tenant_users";
DROP POLICY IF EXISTS tenant_users_tenant_update ON "tenant_users";
DROP POLICY IF EXISTS tenant_users_tenant_delete ON "tenant_users";

CREATE POLICY tenant_users_tenant_select ON "tenant_users"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_users_tenant_insert ON "tenant_users"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_users_tenant_update ON "tenant_users"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_users_tenant_delete ON "tenant_users"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- partner_clients policies
DROP POLICY IF EXISTS partner_clients_tenant_select ON "partner_clients";
DROP POLICY IF EXISTS partner_clients_tenant_insert ON "partner_clients";
DROP POLICY IF EXISTS partner_clients_tenant_update ON "partner_clients";
DROP POLICY IF EXISTS partner_clients_tenant_delete ON "partner_clients";

CREATE POLICY partner_clients_tenant_select ON "partner_clients"
    FOR SELECT USING (partner_id = get_current_tenant_id() OR client_id = get_current_tenant_id());

CREATE POLICY partner_clients_tenant_insert ON "partner_clients"
    FOR INSERT WITH CHECK (partner_id = get_current_tenant_id());

CREATE POLICY partner_clients_tenant_update ON "partner_clients"
    FOR UPDATE USING (partner_id = get_current_tenant_id())
    WITH CHECK (partner_id = get_current_tenant_id());

CREATE POLICY partner_clients_tenant_delete ON "partner_clients"
    FOR DELETE USING (partner_id = get_current_tenant_id());

-- partner_commissions policies
DROP POLICY IF EXISTS partner_commissions_tenant_select ON "partner_commissions";
DROP POLICY IF EXISTS partner_commissions_tenant_insert ON "partner_commissions";
DROP POLICY IF EXISTS partner_commissions_tenant_update ON "partner_commissions";
DROP POLICY IF EXISTS partner_commissions_tenant_delete ON "partner_commissions";

CREATE POLICY partner_commissions_tenant_select ON "partner_commissions"
    FOR SELECT USING (partner_id = get_current_tenant_id());

CREATE POLICY partner_commissions_tenant_insert ON "partner_commissions"
    FOR INSERT WITH CHECK (partner_id = get_current_tenant_id());

CREATE POLICY partner_commissions_tenant_update ON "partner_commissions"
    FOR UPDATE USING (partner_id = get_current_tenant_id())
    WITH CHECK (partner_id = get_current_tenant_id());

CREATE POLICY partner_commissions_tenant_delete ON "partner_commissions"
    FOR DELETE USING (partner_id = get_current_tenant_id());

-- ==========================================
-- PROCESS COMPASS
-- ==========================================

-- pc_clients policies
DROP POLICY IF EXISTS pc_clients_tenant_select ON "pc_clients";
DROP POLICY IF EXISTS pc_clients_tenant_insert ON "pc_clients";
DROP POLICY IF EXISTS pc_clients_tenant_update ON "pc_clients";
DROP POLICY IF EXISTS pc_clients_tenant_delete ON "pc_clients";

CREATE POLICY pc_clients_tenant_select ON "pc_clients"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY pc_clients_tenant_insert ON "pc_clients"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY pc_clients_tenant_update ON "pc_clients"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY pc_clients_tenant_delete ON "pc_clients"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- pc_projects policies
DROP POLICY IF EXISTS pc_projects_tenant_select ON "pc_projects";
DROP POLICY IF EXISTS pc_projects_tenant_insert ON "pc_projects";
DROP POLICY IF EXISTS pc_projects_tenant_update ON "pc_projects";
DROP POLICY IF EXISTS pc_projects_tenant_delete ON "pc_projects";

CREATE POLICY pc_projects_tenant_select ON "pc_projects"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY pc_projects_tenant_insert ON "pc_projects"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY pc_projects_tenant_update ON "pc_projects"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY pc_projects_tenant_delete ON "pc_projects"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- pc_crm_stages policies
DROP POLICY IF EXISTS pc_crm_stages_tenant_select ON "pc_crm_stages";
DROP POLICY IF EXISTS pc_crm_stages_tenant_insert ON "pc_crm_stages";
DROP POLICY IF EXISTS pc_crm_stages_tenant_update ON "pc_crm_stages";
DROP POLICY IF EXISTS pc_crm_stages_tenant_delete ON "pc_crm_stages";

CREATE POLICY pc_crm_stages_tenant_select ON "pc_crm_stages"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY pc_crm_stages_tenant_insert ON "pc_crm_stages"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY pc_crm_stages_tenant_update ON "pc_crm_stages"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY pc_crm_stages_tenant_delete ON "pc_crm_stages"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- pc_crm_leads policies
DROP POLICY IF EXISTS pc_crm_leads_tenant_select ON "pc_crm_leads";
DROP POLICY IF EXISTS pc_crm_leads_tenant_insert ON "pc_crm_leads";
DROP POLICY IF EXISTS pc_crm_leads_tenant_update ON "pc_crm_leads";
DROP POLICY IF EXISTS pc_crm_leads_tenant_delete ON "pc_crm_leads";

CREATE POLICY pc_crm_leads_tenant_select ON "pc_crm_leads"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY pc_crm_leads_tenant_insert ON "pc_crm_leads"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY pc_crm_leads_tenant_update ON "pc_crm_leads"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY pc_crm_leads_tenant_delete ON "pc_crm_leads"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- pc_crm_opportunities policies
DROP POLICY IF EXISTS pc_crm_opportunities_tenant_select ON "pc_crm_opportunities";
DROP POLICY IF EXISTS pc_crm_opportunities_tenant_insert ON "pc_crm_opportunities";
DROP POLICY IF EXISTS pc_crm_opportunities_tenant_update ON "pc_crm_opportunities";
DROP POLICY IF EXISTS pc_crm_opportunities_tenant_delete ON "pc_crm_opportunities";

CREATE POLICY pc_crm_opportunities_tenant_select ON "pc_crm_opportunities"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY pc_crm_opportunities_tenant_insert ON "pc_crm_opportunities"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY pc_crm_opportunities_tenant_update ON "pc_crm_opportunities"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY pc_crm_opportunities_tenant_delete ON "pc_crm_opportunities"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- pc_crm_activities policies
DROP POLICY IF EXISTS pc_crm_activities_tenant_select ON "pc_crm_activities";
DROP POLICY IF EXISTS pc_crm_activities_tenant_insert ON "pc_crm_activities";
DROP POLICY IF EXISTS pc_crm_activities_tenant_update ON "pc_crm_activities";
DROP POLICY IF EXISTS pc_crm_activities_tenant_delete ON "pc_crm_activities";

CREATE POLICY pc_crm_activities_tenant_select ON "pc_crm_activities"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY pc_crm_activities_tenant_insert ON "pc_crm_activities"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY pc_crm_activities_tenant_update ON "pc_crm_activities"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY pc_crm_activities_tenant_delete ON "pc_crm_activities"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- pc_pdca_cycles policies
DROP POLICY IF EXISTS pc_pdca_cycles_tenant_select ON "pc_pdca_cycles";
DROP POLICY IF EXISTS pc_pdca_cycles_tenant_insert ON "pc_pdca_cycles";
DROP POLICY IF EXISTS pc_pdca_cycles_tenant_update ON "pc_pdca_cycles";
DROP POLICY IF EXISTS pc_pdca_cycles_tenant_delete ON "pc_pdca_cycles";

CREATE POLICY pc_pdca_cycles_tenant_select ON "pc_pdca_cycles"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY pc_pdca_cycles_tenant_insert ON "pc_pdca_cycles"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY pc_pdca_cycles_tenant_update ON "pc_pdca_cycles"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY pc_pdca_cycles_tenant_delete ON "pc_pdca_cycles"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- pc_requirements policies
DROP POLICY IF EXISTS pc_requirements_tenant_select ON "pc_requirements";
DROP POLICY IF EXISTS pc_requirements_tenant_insert ON "pc_requirements";
DROP POLICY IF EXISTS pc_requirements_tenant_update ON "pc_requirements";
DROP POLICY IF EXISTS pc_requirements_tenant_delete ON "pc_requirements";

CREATE POLICY pc_requirements_tenant_select ON "pc_requirements"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY pc_requirements_tenant_insert ON "pc_requirements"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY pc_requirements_tenant_update ON "pc_requirements"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY pc_requirements_tenant_delete ON "pc_requirements"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- ==========================================
-- CRM EXPANDIDO
-- ==========================================

-- crm_partners policies
DROP POLICY IF EXISTS crm_partners_tenant_select ON "crm_partners";
DROP POLICY IF EXISTS crm_partners_tenant_insert ON "crm_partners";
DROP POLICY IF EXISTS crm_partners_tenant_update ON "crm_partners";
DROP POLICY IF EXISTS crm_partners_tenant_delete ON "crm_partners";

CREATE POLICY crm_partners_tenant_select ON "crm_partners"
    FOR SELECT USING (tenant_id = get_current_tenant_id() OR tenant_id IS NULL);

CREATE POLICY crm_partners_tenant_insert ON "crm_partners"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY crm_partners_tenant_update ON "crm_partners"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY crm_partners_tenant_delete ON "crm_partners"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- crm_contracts policies
DROP POLICY IF EXISTS crm_contracts_tenant_select ON "crm_contracts";
DROP POLICY IF EXISTS crm_contracts_tenant_insert ON "crm_contracts";
DROP POLICY IF EXISTS crm_contracts_tenant_update ON "crm_contracts";
DROP POLICY IF EXISTS crm_contracts_tenant_delete ON "crm_contracts";

CREATE POLICY crm_contracts_tenant_select ON "crm_contracts"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY crm_contracts_tenant_insert ON "crm_contracts"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY crm_contracts_tenant_update ON "crm_contracts"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY crm_contracts_tenant_delete ON "crm_contracts"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- crm_channels policies
DROP POLICY IF EXISTS crm_channels_tenant_select ON "crm_channels";
DROP POLICY IF EXISTS crm_channels_tenant_insert ON "crm_channels";
DROP POLICY IF EXISTS crm_channels_tenant_update ON "crm_channels";
DROP POLICY IF EXISTS crm_channels_tenant_delete ON "crm_channels";

CREATE POLICY crm_channels_tenant_select ON "crm_channels"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY crm_channels_tenant_insert ON "crm_channels"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY crm_channels_tenant_update ON "crm_channels"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY crm_channels_tenant_delete ON "crm_channels"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- crm_threads policies
DROP POLICY IF EXISTS crm_threads_tenant_select ON "crm_threads";
DROP POLICY IF EXISTS crm_threads_tenant_insert ON "crm_threads";
DROP POLICY IF EXISTS crm_threads_tenant_update ON "crm_threads";
DROP POLICY IF EXISTS crm_threads_tenant_delete ON "crm_threads";

CREATE POLICY crm_threads_tenant_select ON "crm_threads"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY crm_threads_tenant_insert ON "crm_threads"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY crm_threads_tenant_update ON "crm_threads"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY crm_threads_tenant_delete ON "crm_threads"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- crm_quick_messages policies
DROP POLICY IF EXISTS crm_quick_messages_tenant_select ON "crm_quick_messages";
DROP POLICY IF EXISTS crm_quick_messages_tenant_insert ON "crm_quick_messages";
DROP POLICY IF EXISTS crm_quick_messages_tenant_update ON "crm_quick_messages";
DROP POLICY IF EXISTS crm_quick_messages_tenant_delete ON "crm_quick_messages";

CREATE POLICY crm_quick_messages_tenant_select ON "crm_quick_messages"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY crm_quick_messages_tenant_insert ON "crm_quick_messages"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY crm_quick_messages_tenant_update ON "crm_quick_messages"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY crm_quick_messages_tenant_delete ON "crm_quick_messages"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- crm_campaigns policies
DROP POLICY IF EXISTS crm_campaigns_tenant_select ON "crm_campaigns";
DROP POLICY IF EXISTS crm_campaigns_tenant_insert ON "crm_campaigns";
DROP POLICY IF EXISTS crm_campaigns_tenant_update ON "crm_campaigns";
DROP POLICY IF EXISTS crm_campaigns_tenant_delete ON "crm_campaigns";

CREATE POLICY crm_campaigns_tenant_select ON "crm_campaigns"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY crm_campaigns_tenant_insert ON "crm_campaigns"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY crm_campaigns_tenant_update ON "crm_campaigns"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY crm_campaigns_tenant_delete ON "crm_campaigns"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- crm_events policies
DROP POLICY IF EXISTS crm_events_tenant_select ON "crm_events";
DROP POLICY IF EXISTS crm_events_tenant_insert ON "crm_events";
DROP POLICY IF EXISTS crm_events_tenant_update ON "crm_events";
DROP POLICY IF EXISTS crm_events_tenant_delete ON "crm_events";

CREATE POLICY crm_events_tenant_select ON "crm_events"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY crm_events_tenant_insert ON "crm_events"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY crm_events_tenant_update ON "crm_events"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY crm_events_tenant_delete ON "crm_events"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- crm_products policies
DROP POLICY IF EXISTS crm_products_tenant_select ON "crm_products";
DROP POLICY IF EXISTS crm_products_tenant_insert ON "crm_products";
DROP POLICY IF EXISTS crm_products_tenant_update ON "crm_products";
DROP POLICY IF EXISTS crm_products_tenant_delete ON "crm_products";

CREATE POLICY crm_products_tenant_select ON "crm_products"
    FOR SELECT USING (tenant_id = get_current_tenant_id() OR tenant_id IS NULL);

CREATE POLICY crm_products_tenant_insert ON "crm_products"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY crm_products_tenant_update ON "crm_products"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY crm_products_tenant_delete ON "crm_products"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- crm_clients policies
DROP POLICY IF EXISTS crm_clients_tenant_select ON "crm_clients";
DROP POLICY IF EXISTS crm_clients_tenant_insert ON "crm_clients";
DROP POLICY IF EXISTS crm_clients_tenant_update ON "crm_clients";
DROP POLICY IF EXISTS crm_clients_tenant_delete ON "crm_clients";

CREATE POLICY crm_clients_tenant_select ON "crm_clients"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY crm_clients_tenant_insert ON "crm_clients"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY crm_clients_tenant_update ON "crm_clients"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY crm_clients_tenant_delete ON "crm_clients"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- crm_pipeline_stages policies
DROP POLICY IF EXISTS crm_pipeline_stages_tenant_select ON "crm_pipeline_stages";
DROP POLICY IF EXISTS crm_pipeline_stages_tenant_insert ON "crm_pipeline_stages";
DROP POLICY IF EXISTS crm_pipeline_stages_tenant_update ON "crm_pipeline_stages";
DROP POLICY IF EXISTS crm_pipeline_stages_tenant_delete ON "crm_pipeline_stages";

CREATE POLICY crm_pipeline_stages_tenant_select ON "crm_pipeline_stages"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY crm_pipeline_stages_tenant_insert ON "crm_pipeline_stages"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY crm_pipeline_stages_tenant_update ON "crm_pipeline_stages"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY crm_pipeline_stages_tenant_delete ON "crm_pipeline_stages"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- crm_leads policies
DROP POLICY IF EXISTS crm_leads_tenant_select ON "crm_leads";
DROP POLICY IF EXISTS crm_leads_tenant_insert ON "crm_leads";
DROP POLICY IF EXISTS crm_leads_tenant_update ON "crm_leads";
DROP POLICY IF EXISTS crm_leads_tenant_delete ON "crm_leads";

CREATE POLICY crm_leads_tenant_select ON "crm_leads"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY crm_leads_tenant_insert ON "crm_leads"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY crm_leads_tenant_update ON "crm_leads"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY crm_leads_tenant_delete ON "crm_leads"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- crm_opportunities policies
DROP POLICY IF EXISTS crm_opportunities_tenant_select ON "crm_opportunities";
DROP POLICY IF EXISTS crm_opportunities_tenant_insert ON "crm_opportunities";
DROP POLICY IF EXISTS crm_opportunities_tenant_update ON "crm_opportunities";
DROP POLICY IF EXISTS crm_opportunities_tenant_delete ON "crm_opportunities";

CREATE POLICY crm_opportunities_tenant_select ON "crm_opportunities"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY crm_opportunities_tenant_insert ON "crm_opportunities"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY crm_opportunities_tenant_update ON "crm_opportunities"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY crm_opportunities_tenant_delete ON "crm_opportunities"
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- crm_proposals policies
DROP POLICY IF EXISTS crm_proposals_tenant_select ON "crm_proposals";
DROP POLICY IF EXISTS crm_proposals_tenant_insert ON "crm_proposals";
DROP POLICY IF EXISTS crm_proposals_tenant_update ON "crm_proposals";
DROP POLICY IF EXISTS crm_proposals_tenant_delete ON "crm_proposals";

CREATE POLICY crm_proposals_tenant_select ON "crm_proposals"
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY crm_proposals_tenant_insert ON "crm_proposals"
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY crm_proposals_tenant_update ON "crm_proposals"
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY crm_proposals_tenant_delete ON "crm_proposals"
    FOR DELETE USING (tenant_id = get_current_tenant_id());
