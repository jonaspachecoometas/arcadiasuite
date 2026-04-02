# Migrações RLS - Row Level Security

Esta pasta contém as migrações para habilitar Row Level Security (RLS) no PostgreSQL,
garantindo isolamento de dados entre tenants (multi-tenancy).

## Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `001_enable_rls.sql` | Habilita RLS em todas as tabelas com `tenant_id` |
| `002_create_policies.sql` | Cria políticas CRUD por tenant |
| `003_tenant_context.sql` | Funções de contexto e triggers de validação |

## Como Aplicar

### Opção 1: Aplicar via psql (Produção)

```bash
# Configurar variáveis de ambiente
export DATABASE_URL="postgresql://user:pass@host:5432/arcadia"

# Aplicar migrações
psql $DATABASE_URL -f migrations/001_enable_rls.sql
psql $DATABASE_URL -f migrations/002_create_policies.sql
psql $DATABASE_URL -f migrations/003_tenant_context.sql
```

### Opção 2: Aplicar via script Node.js

```bash
npm run db:apply-rls
```

(Nota: este script precisa ser criado no package.json)

### Opção 3: Aplicar via Docker

```bash
docker exec -i arcadia-db psql -U arcadia -d arcadia < migrations/001_enable_rls.sql
docker exec -i arcadia-db psql -U arcadia -d arcadia < migrations/002_create_policies.sql
docker exec -i arcadia-db psql -U arcadia -d arcadia < migrations/003_tenant_context.sql
```

## Tabelas Protegidas

### Productivity & Workspace
- `workspace_pages`, `quick_notes`, `activity_feed`
- `conversations`, `knowledge_base`, `chat_threads`, `manus_runs`

### Low-Code / Dev Center
- `arc_doctypes`, `arc_layouts`

### Multi-Tenancy Core
- `tenant_empresas`, `tenant_users`, `partner_clients`, `partner_commissions`

### Process Compass
- `pc_clients`, `pc_projects`, `pc_crm_stages`, `pc_crm_leads`
- `pc_crm_opportunities`, `pc_crm_activities`, `pc_pdca_cycles`, `pc_requirements`

### CRM Expandido
- `crm_partners`, `crm_contracts`, `crm_channels`, `crm_threads`
- `crm_quick_messages`, `crm_campaigns`, `crm_events`, `crm_products`
- `crm_clients`, `crm_pipeline_stages`, `crm_leads`, `crm_opportunities`, `crm_proposals`

## Funções Disponíveis

```sql
-- Obter tenant atual do contexto
SELECT get_current_tenant_id();

-- Verificar se é admin
SELECT is_tenant_admin();

-- Setar contexto (deve ser chamado pela aplicação)
SELECT set_tenant_context(1, 'user-uuid', 'member');

-- Verificar acesso
SELECT can_access_tenant('user-uuid', 1);

-- View de resumo
SELECT * FROM tenant_security_summary;
```

## Integração com a Aplicação

O middleware da aplicação deve chamar `set_tenant_context` após autenticação:

```typescript
// server/middleware/tenant-context.ts
import { db } from "../db";

export async function setTenantContext(req, res, next) {
  if (req.user?.tenantId) {
    await db.execute(
      sql`SELECT set_tenant_context(${req.user.tenantId}, ${req.user.id}, ${req.user.tenantRole})`
    );
  }
  next();
}
```

## Rollback

Para desabilitar RLS (emergência apenas):

```sql
-- Exemplo para uma tabela
ALTER TABLE workspace_pages DISABLE ROW LEVEL SECURITY;
DROP POLICY workspace_pages_tenant_select ON workspace_pages;
-- ... etc
```

## Notas

- As políticas usam `get_current_tenant_id()` que lê do contexto da sessão
- Triggers validam se `tenant_id` corresponde ao contexto antes de INSERT/UPDATE
- Tabelas sem `tenant_id` (users, tenants, profiles) NÃO têm RLS (acesso global)
- A view `tenant_security_summary` mostra estatísticas por tenant
