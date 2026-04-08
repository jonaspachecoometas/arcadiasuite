# MetaSet BI - Apache Superset Integration

> **Status:** ✅ Consolidado (Abril 2026)  
> **Localização:** `/server/bi/metaset/` (implementação Python)  
> **Legado:** `/server/metaset/backup/` (implementação anterior Metabase - deprecated)

---

## 🏗️ Arquitetura

O MetaSet BI é um fork customizado do **Apache Superset 4.1.0** integrado ao Arcádia Suite.

```
┌─────────────────────────────────────────────────────────────┐
│                    ARCÁDIA SUITE (Porta 5000)               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           BI-API Gateway (Porta 8004)               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │  /bi/api/*  │  │/bi/metaset/*│  │ /bi/fdb/*   │  │   │
│  │  │  (nativo)   │  │  (proxy)    │  │  (proxy)    │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │   │
│  │         └─────────────────┴─────────────────┘        │   │
│  └─────────────────────────┬───────────────────────────┘   │
└────────────────────────────┼────────────────────────────────┘
                             │
         ┌───────────────────┴───────────────────┐
         ▼                                       ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│    METASET BI (8100)    │         │   FDB-BRIDGE (8200)     │
│  Apache Superset 4.1.0  │◄───────►│  Sync Firebird → PG     │
│  - Dashboards           │         │  - Change Data Capture  │
│  - SQL Lab              │         │  - Real-time sync       │
│  - Charts               │         │  - Tenant isolation     │
│  - Row Level Security   │         │                         │
└─────────────────────────┘         └─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│   PostgreSQL + Redis    │
│   (metaset_db + cache)  │
└─────────────────────────┘
```

---

## 📁 Estrutura de Arquivos

### Implementação Atual (Apache Superset)

**Local:** `/server/bi/metaset/`

| Arquivo/Pasta | Descrição |
|---------------|-----------|
| `main.py` | FastAPI wrapper - entry point principal (Porta 8100) |
| `run.py` | Entry point alternativo via Gunicorn |
| `superset_config.py` | Configuração principal do Superset |
| `security_manager.py` | ArcadiaSecurityManager (JWT + RLS) |
| `Dockerfile` | Container do MetaSet |
| `init.sh` | Script de inicialização |
| `requirements.txt` | Dependências Python |
| `superset-src/` | Código fonte Apache Superset 4.1.0 |
| `config/` | Configurações adicionais |
| `branding/` | Assets de branding (logos, favicons) |
| `security/` | Módulos de segurança customizados |
| `extensions/` | Extensões do Superset |
| `templates/` | Templates customizados |

### Código Legado (Backup)

**Local:** `/server/metaset/backup/`

| Arquivo | Descrição | Status |
|---------|-----------|--------|
| `client.ts` | Cliente TypeScript para Metabase | ❌ Deprecated |
| `routes.ts` | Rotas Express para Metabase API | ❌ Deprecated |

> **Nota:** O código legado foi baseado em Metabase e foi substituído pela implementação Apache Superset mais robusta.

---

## 🔌 API Endpoints

### BI-API Gateway (Porta 8004)

Proxy e endpoints nativos para o MetaSet:

```typescript
// Proxy para MetaSet
GET/POST /bi/metaset/*  → Proxy para http://metaset:8100/*

// Endpoints nativos
GET    /bi/api/dashboards              // Lista dashboards
POST   /bi/api/dashboards              // Cria dashboard
GET    /bi/api/health                  // Health check
POST   /bi/api/query                   // Query SQL
```

### MetaSet Direto (Porta 8100)

API nativa do Apache Superset:

```
GET    /health                         // Health check
GET    /api/v1/dashboard/              // Lista dashboards
GET    /api/v1/dashboard/{id}          // Detalhes do dashboard
POST   /api/v1/dashboard/              // Cria dashboard
GET    /api/v1/chart/                  // Lista charts
GET    /api/v1/dataset/                // Lista datasets
POST   /api/v1/security/guest_token/   // Guest token (embedding)
GET    /api/v1/database/               // Lista conexões de banco
POST   /api/v1/database/               // Cria conexão
GET    /sqllab/                        // SQL Lab UI
```

---

## ⚙️ Configuração

### Variáveis de Ambiente

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

### Feature Flags

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

## 🔐 Segurança

### ArcadiaSecurityManager

Integração customizada que:

1. **Extrai JWT** do header `Authorization: Bearer <token>`
2. **Identifica tenant** do payload JWT (`tenant_id`)
3. **Aplica RLS** automaticamente via `SET LOCAL app.current_tenant`
4. **Mapeia roles:**
   - `superadmin` → `Admin`
   - `admin` → `Alpha`
   - `analyst` → `Gamma`
   - `viewer` → `Public`

### Row Level Security (RLS)

```sql
-- Política aplicada automaticamente
SET LOCAL app.current_tenant = <tenant_id>;

-- Views filtram por tenant
CREATE VIEW tenant_data AS
SELECT * FROM data 
WHERE tenant_id = current_setting('app.current_tenant')::int;
```

---

## 🚀 Deployment

### Docker Compose (Desenvolvimento)

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
      - "arcadia.capabilities=dashboards,charts,sql_lab,rls"
```

### Inicialização

```bash
# Via docker compose
docker compose up metaset

# Ou diretamente
cd server/bi/metaset
python run.py --host 0.0.0.0 --port 8100 --workers 2
```

---

## 📊 Uso

### Criar Dashboard via API

```bash
curl -X POST http://localhost:8004/bi/api/dashboards \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Vendas Q1 2026",
    "description": "Dashboard de vendas"
  }'
```

### Executar Query SQL

```bash
curl -X POST http://localhost:8004/bi/metaset/sqllab/execute \
  -H "Authorization: Bearer <token>" \
  -d '{
    "database_id": 1,
    "query": "SELECT * FROM sales LIMIT 100"
  }'
```

### Guest Token (Embedding)

```bash
curl -X POST http://localhost:8100/api/v1/security/guest_token/ \
  -H "Content-Type: application/json" \
  -d '{
    "resources": [{"type": "dashboard", "id": "1"}],
    "rls": [{"dataset": 1, "clause": "tenant_id = 123"}]
  }'
```

---

## 🔄 Integração FDB-Bridge

O FDB-Bridge (Porta 8200) sincroniza dados do Firebird (ERP legado) para PostgreSQL:

```
Firebird (ERP) → FDB-Bridge → PostgreSQL → MetaSet
```

**Endpoints:**
- `POST /bi/fdb/sync/trigger` - Inicia sync manual
- `GET /bi/fdb/sync/status/{job_id}` - Status do sync

---

## 📝 Histórico de Mudanças

| Data | Mudança |
|------|---------|
| 2026-04-08 | Consolidação: removido código legado Metabase, unificado em Apache Superset |
| 2026-04-07 | Implementação ArcadiaSecurityManager com JWT + RLS |
| 2026-04-01 | Setup inicial Apache Superset 4.1.0 fork |
| 2026-03-27 | Código legado Metabase (backup em `/server/metaset/backup/`) |

---

## 🔗 Referências

- [Apache Superset Docs](https://superset.apache.org/docs/)
- [Superset API Reference](https://superset.apache.org/docs/api/)
- [Embedding Docs](https://superset.apache.org/docs/embedding/)
- `/docs/ARCADIA_SUITE_ARQUITETURA.md`
- `/docs/KERNEL_SPEC.md`
