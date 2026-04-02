-- Migration 003: Tenant Context Management
-- Data: 2026-04-02
-- Description: Configuração de contexto de tenant e validações automáticas

-- ==========================================
-- FUNÇÃO: Validar se tenant existe e está ativo
-- ==========================================

CREATE OR REPLACE FUNCTION validate_tenant_active(tenant_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    tenant_status TEXT;
BEGIN
    IF tenant_id IS NULL THEN
        RETURN TRUE; -- Algumas tabelas permitem NULL (globais)
    END IF;
    
    SELECT status INTO tenant_status
    FROM tenants
    WHERE id = tenant_id;
    
    IF tenant_status IS NULL THEN
        RAISE EXCEPTION 'Tenant % não encontrado', tenant_id;
    END IF;
    
    IF tenant_status != 'active' THEN
        RAISE EXCEPTION 'Tenant % não está ativo (status: %)', tenant_id, tenant_status;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- FUNÇÃO: Obter hierarquia de tenants (para master/partner ver subs)
-- ==========================================

CREATE OR REPLACE FUNCTION get_tenant_hierarchy(parent_tenant_id INTEGER)
RETURNS TABLE (tenant_id INTEGER) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE hierarchy AS (
        -- Base: o próprio tenant
        SELECT id FROM tenants WHERE id = parent_tenant_id
        
        UNION ALL
        
        -- Recursão: filhos diretos
        SELECT t.id
        FROM tenants t
        JOIN hierarchy h ON t.parent_tenant_id = h.id
    )
    SELECT id FROM hierarchy;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- FUNÇÃO: Verificar se usuário pode acessar tenant específico
-- ==========================================

CREATE OR REPLACE FUNCTION can_access_tenant(user_id VARCHAR, target_tenant_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    user_tenant_id INTEGER;
    user_role TEXT;
    target_parent_id INTEGER;
    is_owner BOOLEAN;
BEGIN
    -- Busca informações do usuário
    SELECT 
        tu.tenant_id, 
        tu.role,
        tu.is_owner = 'true'
    INTO 
        user_tenant_id, 
        user_role,
        is_owner
    FROM tenant_users tu
    WHERE tu.user_id = can_access_tenant.user_id
    LIMIT 1;
    
    IF user_tenant_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Se é o próprio tenant, permite
    IF user_tenant_id = target_tenant_id THEN
        RETURN TRUE;
    END IF;
    
    -- Se é master/partner, permite ver filhos
    SELECT parent_tenant_id INTO target_parent_id
    FROM tenants
    WHERE id = target_tenant_id;
    
    IF target_parent_id = user_tenant_id THEN
        RETURN TRUE;
    END IF;
    
    -- Se é admin master, pode ver todos
    IF is_owner AND user_role = 'owner' THEN
        -- Verifica se é master
        DECLARE
            user_tenant_type TEXT;
        BEGIN
            SELECT tenant_type INTO user_tenant_type
            FROM tenants
            WHERE id = user_tenant_id;
            
            IF user_tenant_type = 'master' THEN
                RETURN TRUE;
            END IF;
        END;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- TRIGGER FUNCTION: Validar tenant_id antes de inserir/atualizar
-- ==========================================

CREATE OR REPLACE FUNCTION validate_tenant_id()
RETURNS TRIGGER AS $$
DECLARE
    context_tenant_id INTEGER;
BEGIN
    -- Se não tem tenant_id, permite (tabelas globais)
    IF NEW.tenant_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Valida se tenant está ativo
    PERFORM validate_tenant_active(NEW.tenant_id);
    
    -- Opcional: validar contra contexto da aplicação
    BEGIN
        context_tenant_id := current_setting('app.current_tenant_id', true)::INTEGER;
        IF context_tenant_id IS NOT NULL AND NEW.tenant_id != context_tenant_id THEN
            RAISE EXCEPTION 'Tenant ID % não corresponde ao contexto atual %', 
                NEW.tenant_id, context_tenant_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Se não conseguiu ler o contexto, continua (para migrations, seeds, etc)
        NULL;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- CRIAR TRIGGERS PARA VALIDAÇÃO AUTOMÁTICA
-- ==========================================

-- workspace_pages
DROP TRIGGER IF EXISTS trigger_validate_workspace_pages_tenant ON "workspace_pages";
CREATE TRIGGER trigger_validate_workspace_pages_tenant
    BEFORE INSERT OR UPDATE ON "workspace_pages"
    FOR EACH ROW
    EXECUTE FUNCTION validate_tenant_id();

-- quick_notes
DROP TRIGGER IF EXISTS trigger_validate_quick_notes_tenant ON "quick_notes";
CREATE TRIGGER trigger_validate_quick_notes_tenant
    BEFORE INSERT OR UPDATE ON "quick_notes"
    FOR EACH ROW
    EXECUTE FUNCTION validate_tenant_id();

-- activity_feed
DROP TRIGGER IF EXISTS trigger_validate_activity_feed_tenant ON "activity_feed";
CREATE TRIGGER trigger_validate_activity_feed_tenant
    BEFORE INSERT OR UPDATE ON "activity_feed"
    FOR EACH ROW
    EXECUTE FUNCTION validate_tenant_id();

-- conversations
DROP TRIGGER IF EXISTS trigger_validate_conversations_tenant ON "conversations";
CREATE TRIGGER trigger_validate_conversations_tenant
    BEFORE INSERT OR UPDATE ON "conversations"
    FOR EACH ROW
    EXECUTE FUNCTION validate_tenant_id();

-- knowledge_base
DROP TRIGGER IF EXISTS trigger_validate_knowledge_base_tenant ON "knowledge_base";
CREATE TRIGGER trigger_validate_knowledge_base_tenant
    BEFORE INSERT OR UPDATE ON "knowledge_base"
    FOR EACH ROW
    EXECUTE FUNCTION validate_tenant_id();

-- chat_threads
DROP TRIGGER IF EXISTS trigger_validate_chat_threads_tenant ON "chat_threads";
CREATE TRIGGER trigger_validate_chat_threads_tenant
    BEFORE INSERT OR UPDATE ON "chat_threads"
    FOR EACH ROW
    EXECUTE FUNCTION validate_tenant_id();

-- manus_runs
DROP TRIGGER IF EXISTS trigger_validate_manus_runs_tenant ON "manus_runs";
CREATE TRIGGER trigger_validate_manus_runs_tenant
    BEFORE INSERT OR UPDATE ON "manus_runs"
    FOR EACH ROW
    EXECUTE FUNCTION validate_tenant_id();

-- tenant_empresas
DROP TRIGGER IF EXISTS trigger_validate_tenant_empresas_tenant ON "tenant_empresas";
CREATE TRIGGER trigger_validate_tenant_empresas_tenant
    BEFORE INSERT OR UPDATE ON "tenant_empresas"
    FOR EACH ROW
    EXECUTE FUNCTION validate_tenant_id();

-- pc_clients
DROP TRIGGER IF EXISTS trigger_validate_pc_clients_tenant ON "pc_clients";
CREATE TRIGGER trigger_validate_pc_clients_tenant
    BEFORE INSERT OR UPDATE ON "pc_clients"
    FOR EACH ROW
    EXECUTE FUNCTION validate_tenant_id();

-- pc_projects
DROP TRIGGER IF EXISTS trigger_validate_pc_projects_tenant ON "pc_projects";
CREATE TRIGGER trigger_validate_pc_projects_tenant
    BEFORE INSERT OR UPDATE ON "pc_projects"
    FOR EACH ROW
    EXECUTE FUNCTION validate_tenant_id();

-- pc_crm_leads
DROP TRIGGER IF EXISTS trigger_validate_pc_crm_leads_tenant ON "pc_crm_leads";
CREATE TRIGGER trigger_validate_pc_crm_leads_tenant
    BEFORE INSERT OR UPDATE ON "pc_crm_leads"
    FOR EACH ROW
    EXECUTE FUNCTION validate_tenant_id();

-- pc_crm_opportunities
DROP TRIGGER IF EXISTS trigger_validate_pc_crm_opportunities_tenant ON "pc_crm_opportunities";
CREATE TRIGGER trigger_validate_pc_crm_opportunities_tenant
    BEFORE INSERT OR UPDATE ON "pc_crm_opportunities"
    FOR EACH ROW
    EXECUTE FUNCTION validate_tenant_id();

-- pc_pdca_cycles
DROP TRIGGER IF EXISTS trigger_validate_pc_pdca_cycles_tenant ON "pc_pdca_cycles";
CREATE TRIGGER trigger_validate_pc_pdca_cycles_tenant
    BEFORE INSERT OR UPDATE ON "pc_pdca_cycles"
    FOR EACH ROW
    EXECUTE FUNCTION validate_tenant_id();

-- crm_partners
DROP TRIGGER IF EXISTS trigger_validate_crm_partners_tenant ON "crm_partners";
CREATE TRIGGER trigger_validate_crm_partners_tenant
    BEFORE INSERT OR UPDATE ON "crm_partners"
    FOR EACH ROW
    EXECUTE FUNCTION validate_tenant_id();

-- crm_contracts
DROP TRIGGER IF EXISTS trigger_validate_crm_contracts_tenant ON "crm_contracts";
CREATE TRIGGER trigger_validate_crm_contracts_tenant
    BEFORE INSERT OR UPDATE ON "crm_contracts"
    FOR EACH ROW
    EXECUTE FUNCTION validate_tenant_id();

-- crm_channels
DROP TRIGGER IF EXISTS trigger_validate_crm_channels_tenant ON "crm_channels";
CREATE TRIGGER trigger_validate_crm_channels_tenant
    BEFORE INSERT OR UPDATE ON "crm_channels"
    FOR EACH ROW
    EXECUTE FUNCTION validate_tenant_id();

-- crm_threads
DROP TRIGGER IF EXISTS trigger_validate_crm_threads_tenant ON "crm_threads";
CREATE TRIGGER trigger_validate_crm_threads_tenant
    BEFORE INSERT OR UPDATE ON "crm_threads"
    FOR EACH ROW
    EXECUTE FUNCTION validate_tenant_id();

-- crm_campaigns
DROP TRIGGER IF EXISTS trigger_validate_crm_campaigns_tenant ON "crm_campaigns";
CREATE TRIGGER trigger_validate_crm_campaigns_tenant
    BEFORE INSERT OR UPDATE ON "crm_campaigns"
    FOR EACH ROW
    EXECUTE FUNCTION validate_tenant_id();

-- crm_events
DROP TRIGGER IF EXISTS trigger_validate_crm_events_tenant ON "crm_events";
CREATE TRIGGER trigger_validate_crm_events_tenant
    BEFORE INSERT OR UPDATE ON "crm_events"
    FOR EACH ROW
    EXECUTE FUNCTION validate_tenant_id();

-- crm_products
DROP TRIGGER IF EXISTS trigger_validate_crm_products_tenant ON "crm_products";
CREATE TRIGGER trigger_validate_crm_products_tenant
    BEFORE INSERT OR UPDATE ON "crm_products"
    FOR EACH ROW
    EXECUTE FUNCTION validate_tenant_id();

-- crm_clients
DROP TRIGGER IF EXISTS trigger_validate_crm_clients_tenant ON "crm_clients";
CREATE TRIGGER trigger_validate_crm_clients_tenant
    BEFORE INSERT OR UPDATE ON "crm_clients"
    FOR EACH ROW
    EXECUTE FUNCTION validate_tenant_id();

-- crm_leads
DROP TRIGGER IF EXISTS trigger_validate_crm_leads_tenant ON "crm_leads";
CREATE TRIGGER trigger_validate_crm_leads_tenant
    BEFORE INSERT OR UPDATE ON "crm_leads"
    FOR EACH ROW
    EXECUTE FUNCTION validate_tenant_id();

-- crm_opportunities
DROP TRIGGER IF EXISTS trigger_validate_crm_opportunities_tenant ON "crm_opportunities";
CREATE TRIGGER trigger_validate_crm_opportunities_tenant
    BEFORE INSERT OR UPDATE ON "crm_opportunities"
    FOR EACH ROW
    EXECUTE FUNCTION validate_tenant_id();

-- crm_proposals
DROP TRIGGER IF EXISTS trigger_validate_crm_proposals_tenant ON "crm_proposals";
CREATE TRIGGER trigger_validate_crm_proposals_tenant
    BEFORE INSERT OR UPDATE ON "crm_proposals"
    FOR EACH ROW
    EXECUTE FUNCTION validate_tenant_id();

-- ==========================================
-- VIEW: Resumo de segurança por tenant
-- ==========================================

CREATE OR REPLACE VIEW tenant_security_summary AS
SELECT 
    t.id AS tenant_id,
    t.name AS tenant_name,
    t.slug,
    t.tenant_type,
    t.status,
    (SELECT COUNT(*) FROM tenant_users tu WHERE tu.tenant_id = t.id) AS user_count,
    (SELECT COUNT(*) FROM workspace_pages wp WHERE wp.tenant_id = t.id) AS workspace_pages_count,
    (SELECT COUNT(*) FROM pc_clients pc WHERE pc.tenant_id = t.id) AS clients_count,
    (SELECT COUNT(*) FROM pc_projects pp WHERE pp.tenant_id = t.id) AS projects_count,
    (SELECT COUNT(*) FROM crm_leads cl WHERE cl.tenant_id = t.id) AS leads_count,
    (SELECT COUNT(*) FROM crm_opportunities co WHERE co.tenant_id = t.id) AS opportunities_count
FROM tenants t
ORDER BY t.id;

-- ==========================================
-- FUNÇÃO: Setar contexto de tenant (para uso na aplicação)
-- ==========================================

CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id INTEGER, p_user_id VARCHAR, p_role TEXT DEFAULT 'member')
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', p_tenant_id::TEXT, FALSE);
    PERFORM set_config('app.current_user_id', p_user_id, FALSE);
    PERFORM set_config('app.current_tenant_role', p_role, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- FUNÇÃO: Limpar contexto de tenant
-- ==========================================

CREATE OR REPLACE FUNCTION clear_tenant_context()
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', '', FALSE);
    PERFORM set_config('app.current_user_id', '', FALSE);
    PERFORM set_config('app.current_tenant_role', '', FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- COMENTÁRIOS DE DOCUMENTAÇÃO
-- ==========================================

COMMENT ON FUNCTION get_current_tenant_id() IS 'Retorna o ID do tenant atual do contexto da aplicação';
COMMENT ON FUNCTION is_tenant_admin() IS 'Verifica se o usuário atual é admin/owner do tenant';
COMMENT ON FUNCTION validate_tenant_active(INTEGER) IS 'Valida se um tenant existe e está ativo';
COMMENT ON FUNCTION can_access_tenant(VARCHAR, INTEGER) IS 'Verifica se um usuário pode acessar um tenant específico';
COMMENT ON FUNCTION set_tenant_context(INTEGER, VARCHAR, TEXT) IS 'Define o contexto de tenant para a sessão atual';
COMMENT ON FUNCTION clear_tenant_context() IS 'Limpa o contexto de tenant da sessão atual';
COMMENT ON VIEW tenant_security_summary IS 'Resumo de segurança e dados por tenant';
