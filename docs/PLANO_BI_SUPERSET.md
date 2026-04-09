# PLANO BI — MetaSet (Apache Superset)
## Arquitetura Consolidada
### Versão 2.0 — Abril 2026

---

## 1. STATUS — CONSOLIDAÇÃO CONCLUÍDA ✅

### 1.1 O que foi realizado

A migração do Metabase para o Apache Superset foi **concluída** em abril de 2026.

| Componente | Status | Localização |
|---|---|---|
| **MetaSet (Apache Superset 4.1.0)** | ✅ Implementado | `/server/bi/metaset/` |
| **Cliente TypeScript** | ✅ Implementado | `/server/bi/metaset-client/` |
| **Rotas Express** | ✅ Implementado | `/server/bi/metaset-client/routes.ts` |
| **Código legado Metabase** | ✅ Backup | `/server/metaset/backup/` |
| **Integração Kernel** | ✅ Ativa | Porta 8100 |
| **Documentação** | ✅ Atualizada | `/server/metaset/README.md` |

### 1.2 Arquitetura Consolidada

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ARCÁDIA SUITE (Porta 5000)                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    BI-API GATEWAY (Porta 8004)                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │   │
│  │  │ /bi/api/*   │  │/bi/metaset/*│  │ /bi/fdb/*                   │  │   │
│  │  │ (nativo)    │  │ (proxy)     │  │ (proxy)                     │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └─────────────┬───────────────┘  │   │
│  │         └─────────────────┴───────────────────────┘                  │   │
│  └─────────────────────────────┬────────────────────────────────────────┘   │
└────────────────────────────────┼────────────────────────────────────────────┘
                                 │
         ┌───────────────────────┴───────────────────────┐
         ▼                                               ▼
┌─────────────────────────┐                 ┌─────────────────────────┐
│   METASET BI (Porta 8100)│                 │   FDB-BRIDGE (8200)     │
│  Apache Superset 4.1.0   │                 │  Sync Firebird → PG     │
│  ┌─────────────────┐     │                 │  - Change Data Capture  │
│  │  superset-src/  │     │                 │  - Real-time sync       │
│  │  - Dashboards   │     │                 │  - Tenant isolation     │
│  │  - SQL Lab      │     │                 │                         │
│  │  - Charts       │     │                 │                         │
│  │  - RLS          │     │                 │                         │
│  └─────────────────┘     │                 │                         │
└─────────────────────────┘                 └─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  PostgreSQL + Redis     │
│  (metaset_db + cache)   │
└─────────────────────────┘
```

---

## 2. ESTRUTURA DE ARQUIVOS

### 2.1 Implementação Atual (Apache Superset)

```
/server/bi/metaset/
├── main.py                    # FastAPI wrapper (Porta 8100)
├── run.py                     # Entry point Gunicorn
├── superset_config.py         # Configuração Superset
├── security_manager.py        # ArcadiaSecurityManager (JWT + RLS)
├── Dockerfile                 # Container MetaSet
├── init.sh                    # Script de inicialização
├── requirements.txt           # Dependências Python
├── superset-src/              # Código fonte Apache Superset 4.1.0
├── config/                    # Configurações adicionais
├── branding/                  # Assets de branding
├── security/                  # Módulos de segurança
├── extensions/                # Extensões
└── templates/                 # Templates customizados

/server/bi/metaset-client/
├── index.ts                   # Cliente TypeScript completo
└── routes.ts                  # Rotas Express /api/bi/metaset/*
```

### 2.2 Código Legado (Backup)

```
/server/metaset/backup/
├── client.ts                  # Cliente Metabase (legado)
└── routes.ts                  # Rotas Metabase (legado)
```

---

## 3. API ENDPOINTS

### 3.1 BI-API Gateway (Porta 8004)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/bi/metaset/health` | GET | Health check |
| `/api/bi/metaset/databases` | GET/POST | Lista/Cria databases |
| `/api/bi/metaset/databases/:id/sync` | POST | Sincroniza schema |
| `/api/bi/metaset/databases/:id/tables` | GET | Lista tabelas |
| `/api/bi/metaset/tables/:id` | GET | Metadata da tabela |
| `/api/bi/metaset/query` | POST | Executa SQL |
| `/api/bi/metaset/charts` | GET/POST | Lista/Cria charts |
| `/api/bi/metaset/charts/:id` | GET/DELETE | Obtém/Deleta chart |
| `/api/bi/metaset/dashboards` | GET/POST | Lista/Cria dashboards |
| `/api/bi/metaset/dashboards/:id` | GET/PUT/DELETE | CRUD dashboard |
| `/api/bi/metaset/guest-token` | POST | Cria guest token |
| `/api/bi/metaset/embed/dashboard/:id` | GET | URL de embed |
| `/api/bi/metaset/suggest/:table` | GET | Sugestões de análise |

### 3.2 MetaSet Direto (Porta 8100)

API nativa do Apache Superset:

```
GET    /health
GET    /api/v1/dashboard/
GET    /api/v1/dashboard/:id
POST   /api/v1/dashboard/
GET    /api/v1/chart/
GET    /api/v1/dataset/
POST   /api/v1/security/guest_token/
GET    /api/v1/database/
GET    /sqllab/
```

---

## 4. CONFIGURAÇÃO

### 4.1 Variáveis de Ambiente

```bash
# MetaSet Connection
METASET_HOST=metaset
METASET_PORT=8100

# Database
DATABASE_URL=postgresql://arcadia:arcadia123@db:5432/metaset_db
ARCADIA_DATABASE_URL=postgresql://arcadia:arcadia123@db:5432/arcadia

# Redis (Cache)
REDIS_URL=redis://redis:6379/1

# Security
METASET_SECRET_KEY=change-in-production
JWT_SECRET_KEY=arcadia-jwt-secret

# Admin
METASET_ADMIN_USER=admin
METASET_ADMIN_EMAIL=admin@arcadia.app
METASET_ADMIN_PASSWORD=metaset2026
```

### 4.2 Feature Flags

```python
FEATURE_FLAGS = {
    "EMBEDDED_SUPERSET": True,           # Embedding de dashboards
    "GUEST_EMBEDDING_ENABLED": True,     # Guest tokens
    "DASHBOARD_RBAC": True,              # Controle de acesso
    "SQLLAB_BACKEND_PERSISTENCE": True,  # Persistência SQL Lab
    "DRILL_BY": True,                    # Drill-down
    "DASHBOARD_CROSS_FILTERS": True,     # Filtros cruzados
}
```

---

## 5. SEGURANÇA

### 5.1 ArcadiaSecurityManager

- Extrai JWT do header `Authorization: Bearer <token>`
- Identifica tenant do payload JWT (`tenant_id`)
- Aplica RLS automaticamente via `SET LOCAL app.current_tenant`
- Mapeia roles: superadmin→Admin, admin→Alpha, analyst→Gamma, viewer→Public

### 5.2 Row Level Security (RLS)

```sql
-- Política aplicada automaticamente
SET LOCAL app.current_tenant = <tenant_id>;

-- Views filtram por tenant
CREATE VIEW tenant_data AS
SELECT * FROM data 
WHERE tenant_id = current_setting('app.current_tenant')::int;
```

---

## 6. CLIENTE TYPESCRIPT

### 6.1 Uso Básico

```typescript
import { metasetClient } from "./server/bi/metaset-client";

// Health check
const health = await metasetClient.isHealthy();

// Listar dashboards
const dashboards = await metasetClient.listDashboards();

// Executar query
const result = await metasetClient.executeSql(1, "SELECT * FROM sales LIMIT 100");

// Criar dashboard
const dashboard = await metasetClient.createDashboard({
  name: "Vendas Q1 2026",
  description: "Dashboard de vendas"
});

// Guest token para embedding
const token = await metasetClient.createGuestToken({
  resources: [{ type: "dashboard", id: "1" }],
  rls: [{ dataset: 1, clause: "tenant_id = 123" }]
});
```

### 6.2 Ferramentas do Manus (Agente IA)

| Ferramenta | Descrição |
|------------|-----------|
| `metaset.query` | Executa SQL |
| `metaset.list_tables` | Lista tabelas |
| `metaset.table_fields` | Campos da tabela |
| `metaset.create_chart` | Cria gráfico |
| `metaset.list_charts` | Lista gráficos |
| `metaset.create_dashboard` | Cria dashboard |
| `metaset.list_dashboards` | Lista dashboards |
| `metaset.suggest_analysis` | Sugere análises |
| `metaset.sync_database` | Sincroniza schema |
| `metaset.health` | Verifica status |

---

## 7. DEPLOYMENT

### 7.1 Docker Compose

```yaml
services:
  metaset:
    build: ./server/bi/metaset
    ports:
      - "8100:8100"
    environment:
      - DATABASE_URL=postgresql://arcadia:arcadia123@db:5432/metaset_db
      - REDIS_URL=redis://redis:6379/1
    labels:
      - "arcadia.discovery.enabled=true"
      - "arcadia.name=MetaSet BI"
      - "arcadia.type=python"
      - "arcadia.port=8100"
      - "arcadia.capabilities=dashboards,charts,sql_lab,rls,embedding"
```

### 7.2 Inicialização

```bash
# Via docker compose
docker compose up metaset

# Ou diretamente
cd server/bi/metaset
python run.py --host 0.0.0.0 --port 8100 --workers 2
```

---

## 8. HISTÓRICO DE MUDANÇAS

| Data | Versão | Mudança |
|------|--------|---------|
| 2026-03 | 1.0 | Plano inicial de migração Metabase → Superset |
| 2026-04-08 | 2.0 | **Consolidação concluída** - Cliente TypeScript, rotas, documentação |

---

## 9. REFERÊNCIAS

- `/server/metaset/README.md` - Documentação completa do MetaSet
- `/server/bi/metaset-client/index.ts` - Cliente TypeScript
- `/server/bi/metaset-client/routes.ts` - Rotas Express
- [Apache Superset Docs](https://superset.apache.org/docs/)
- [Superset API Reference](https://superset.apache.org/docs/api/)
