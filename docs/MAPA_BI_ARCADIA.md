# Arcádia BI — Mapa de Business Intelligence

> Mapa completo da arquitetura de BI, incluindo Motor Python, MetaSet (Apache Superset),
> Cientista (IA), ETL/Staging, APIs e Frontend.
> Atualizado em: Abril 2026

---

## 1. Visão Geral

O BI da Arcádia Suite opera em **4 camadas complementares** que se combinam para oferecer analytics completo: desde queries SQL diretas até dashboards visuais no MetaSet (Apache Superset), passando por análise com IA e ingestão de dados externos.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USUÁRIO / FRONTEND                            │
│                                                                      │
│   BiWorkspace.tsx (2.970 linhas)          MetaSet (Embeddado)       │
│   React + Recharts + Tailwind             Proxy → :8088              │
│   8 abas funcionais                       Dashboards avançados       │
│                                                                      │
│   ┌──────────┬──────────┬──────────┬──────────┬──────────┐          │
│   │ Overview │DataSrc   │ Upload   │ Datasets │ Charts   │          │
│   ├──────────┼──────────┼──────────┼──────────┼──────────┤          │
│   │ Backups  │ Staging  │ Advanced │          │          │          │
│   └──────────┴──────────┴──────────┴──────────┴──────────┘          │
│                                                                      │
│   ┌─────────────────────────────────────┐                            │
│   │  🤖 Assistente BI (IA)              │                            │
│   │  Chat com GPT-4o sobre dados        │                            │
│   │  Prompts rápidos + análise livre    │                            │
│   └─────────────────────────────────────┘                            │
└─────────────────────────┬────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────────────┐
          │               │                       │
          ▼               ▼                       ▼
┌─────────────────┐ ┌──────────────────┐ ┌─────────────────────┐
│  API BI (Node)  │ │BI Engine (Python)│ │ MetaSet (Python)    │
│  /api/bi/*      │ │ /api/bi-engine/* │ │ /bi/metaset/*      │
│                 │ │                  │ │                     │
│ CRUD:           │ │ SQL Execution    │ │ Dashboards          │
│ - DataSources   │ │ Chart Data Gen   │ │ Perguntas/Queries   │
│ - Datasets      │ │ Micro-BI         │ │ Alertas             │
│ - Charts        │ │ Análise Pandas   │ │ Visualizações       │
│ - Dashboards    │ │ Cache (TTL 5min) │ │ Coleções            │
│ - Backups       │ │ Agregações       │ │ Embedding           │
│ - Upload/ETL    │ │ Insights Auto    │ │                     │
│ - Staging       │ │                  │ │                     │
│ - AI Analysis   │ │                  │ │                     │
└────────┬────────┘ └────────┬─────────┘ └──────────┬──────────┘
         │                   │                       │
         ▼                   ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       PostgreSQL (Porta 5432)                        │
│                                                                      │
│  Tabelas de gestão BI: data_sources, bi_datasets, bi_charts,        │
│  bi_dashboards, bi_dashboard_charts, backup_jobs, backup_artifacts,  │
│  staged_tables, staging_mappings, migration_jobs                     │
│                                                                      │
│  Tabelas de negócio: persons, products, sales_orders, fin_*,        │
│  crm_*, whatsapp_messages, valuation_*, etc.                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Os 4 Pilares do BI

### Pilar 1 — Motor BI Python (FastAPI :8004)

O coração analítico. Processa SQL, gera dados para gráficos e fornece Micro-BI.

```
┌─────────────────────────────────────────────────────────────┐
│                    BI ENGINE (Python 3.11)                    │
│                    FastAPI + Pandas + NumPy                   │
│                    Porta: 8004                                │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ SEGURANÇA SQL                                         │   │
│  │                                                       │   │
│  │ ✓ Somente SELECT/WITH permitidos                     │   │
│  │ ✓ 17 keywords bloqueadas (DROP, DELETE, INSERT...)   │   │
│  │ ✓ 7 padrões perigosos filtrados (pg_sleep, --, /*)   │   │
│  │ ✓ Multi-statement bloqueado (múltiplos ;)            │   │
│  │ ✓ Conexão read-only (autocommit)                     │   │
│  │ ✓ Timeout: 30 segundos por query                     │   │
│  │ ✓ Limite: 10.000 linhas por resultado                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ CACHE (QueryCache)                                    │   │
│  │                                                       │   │
│  │ • Tipo: In-memory (OrderedDict)                      │   │
│  │ • Max entries: 200                                    │   │
│  │ • TTL: 300 segundos (5 minutos)                      │   │
│  │ • Key: SHA-256 de (SQL + params)                     │   │
│  │ • Métricas: hits, misses, hit_rate (%)               │   │
│  │ • Invalidação: por padrão ou total                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ CAPABILITIES                                          │   │
│  │                                                       │   │
│  │ • sql_query    → Execução de SELECT arbitrário       │   │
│  │ • chart_data   → Geração de dados para gráficos     │   │
│  │ • micro_bi     → Métricas rápidas com comparação    │   │
│  │ • analysis     → Análise estatística com Pandas     │   │
│  │ • aggregation  → Agregações customizadas            │   │
│  │ • cache        → Cache inteligente de queries       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Pilar 2 — MetaSet (Apache Superset :8100)

Plataforma visual de BI baseada em Apache Superset 4.1.0, acessível via proxy reverso.

```
┌─────────────────────────────────────────────────────────────┐
│                      METASET (SUPERSET)                      │
│               Porta: 8100 (via proxy /bi/metaset)            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ PROXY (http-proxy-middleware)                         │   │
│  │                                                       │   │
│  │ Gateway (:5000) → /bi/metaset/* → MetaSet (:8100)    │   │
│  │                                                       │   │
│  │ • pathRewrite: /bi/metaset → /                      │   │
│  │ • changeOrigin: true                                  │   │
│  │ • timeout: 60 segundos                                │   │
│  │ • Reescrita de Location headers                      │   │
│  │ • Fallback: 502 "MetaSet indisponível"              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ FUNCIONALIDADES                                       │   │
│  │                                                       │   │
│  │ • Dashboards visuais (drag & drop)                   │   │
│  │ • Perguntas SQL / visual query builder               │   │
│  │ • Alertas automáticos                                │   │
│  │ • Coleções organizadas                               │   │
│  │ • Embedding de dashboards                            │   │
│  │ • Filtros interativos                                │   │
│  │ • Exportação (CSV, Excel, PDF)                       │   │
│  │ • Agendamento de relatórios                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ CONEXÃO                                               │   │
│  │                                                       │   │
│  │ Banco: PostgreSQL (mesmo DATABASE_URL do Gateway)    │   │
│  │ Acesso: Todas as tabelas public (read-only)          │   │
│  │ Config: METABASE_HOST, METABASE_PORT                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Pilar 3 — API BI Node.js (Gateway :5000)

Camada de gestão e CRUD para objetos de BI.

```
┌─────────────────────────────────────────────────────────────┐
│                    API BI (Node.js/Express)                   │
│                    Registrada no Gateway (:5000)              │
│                                                              │
│  ┌── Gestão de Objetos BI ──────────────────────────────┐   │
│  │                                                       │   │
│  │  Data Sources → Conexões com bancos externos         │   │
│  │  Datasets     → Conjuntos de dados (table/SQL/API)   │   │
│  │  Charts       → Gráficos salvos (config + dados)     │   │
│  │  Dashboards   → Painéis com layout de charts         │   │
│  │  Backup Jobs  → Jobs de backup programados           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌── ETL & Ingestão ────────────────────────────────────┐   │
│  │                                                       │   │
│  │  Upload      → Importação de arquivos                │   │
│  │  Staging     → Área de preparação para migração      │   │
│  │  Migration   → Jobs de migração de dados             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌── Tabelas Internas ──────────────────────────────────┐   │
│  │                                                       │   │
│  │  Exploração de schema do PostgreSQL                  │   │
│  │  Criação de datasets a partir de tabelas internas    │   │
│  │  Categorização automática (Sistema, CRM, BI, etc.)   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌── Análise com IA ────────────────────────────────────┐   │
│  │                                                       │   │
│  │  OpenAI GPT-4o → Responde perguntas sobre dados      │   │
│  │  Prompts pré-definidos (Resumo, Anomalias, etc.)    │   │
│  │  Formato JSON estruturado (answer + insights)        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Pilar 4 — Cientista (Python: Auto-Programação)

Módulo de IA para análise avançada e geração de código.

```
┌─────────────────────────────────────────────────────────────┐
│                    CIENTISTA (Python)                         │
│                    python-service/services/cientista.py       │
│                                                              │
│  ┌── Análise Estatística ───────────────────────────────┐   │
│  │                                                       │   │
│  │  analyze_data()                                       │   │
│  │  → Shape (rows × columns)                            │   │
│  │  → Tipos de dados por coluna                         │   │
│  │  → Valores ausentes                                  │   │
│  │  → Estatísticas (describe): mean, std, min, max     │   │
│  │  → Amostra dos dados (5 primeiros registros)        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌── Detecção de Padrões ──────────────────────────────┐   │
│  │                                                       │   │
│  │  detect_patterns()                                    │   │
│  │  → Correlações fortes (> 0.7) entre colunas         │   │
│  │  → Tendências (crescente/decrescente) via polyfit   │   │
│  │  → Saída: [{ type, columns, value, description }]   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌── Insights Automáticos ─────────────────────────────┐   │
│  │                                                       │   │
│  │  generate_insights()                                  │   │
│  │  → Valores ausentes por coluna (% de missing)       │   │
│  │  → Detecção de outliers (IQR × 1.5)                 │   │
│  │  → Valores dominantes (> 50% em categóricas)        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌── Auto-Programação (ScientistModule) ────────────────┐  │
│  │                                                       │   │
│  │  generate_analysis_code(description, goal)            │   │
│  │  → Templates: aggregate, filter, predict, correlate  │   │
│  │  → Gera código Python executável                     │   │
│  │  → Salva padrões aprendidos                          │   │
│  │  → Histórico de execuções                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. API REST Completa

### 3.1 — BI Engine Proxy (/api/bi-engine/*)

Proxy do Gateway para o Motor Python FastAPI (:8004):

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/bi-engine/health` | Status do motor (online/offline, banco, cache) |
| GET | `/api/bi-engine/version` | Versão e capabilities |
| GET | `/api/bi-engine/metrics` | Métricas (cache stats, limites) |
| GET | `/api/bi-engine/tables` | Lista todas as tabelas do PostgreSQL |
| GET | `/api/bi-engine/tables/:name/columns` | Schema de colunas de uma tabela |
| GET | `/api/bi-engine/tables/:name/preview` | Preview dos dados (limit padrão: 50) |
| GET | `/api/bi-engine/tables/:name/stats` | Estatísticas (row_count, column_count) |
| POST | `/api/bi-engine/query` | Executa SQL (somente SELECT/WITH) |
| POST | `/api/bi-engine/chart-data` | Gera dados formatados para gráficos |
| POST | `/api/bi-engine/micro-bi` | Micro-BI: métricas rápidas com comparação temporal |
| POST | `/api/bi-engine/analyze` | Análise de dados com Pandas |
| POST | `/api/bi-engine/aggregate` | Agregações customizadas |
| GET | `/api/bi-engine/cache/stats` | Estatísticas do cache |
| POST | `/api/bi-engine/cache/invalidate` | Invalida cache (por padrão ou total) |

### 3.2 — BI Management (/api/bi/*)

CRUD de objetos BI no Gateway Node.js:

#### Data Sources

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/bi/data-sources` | Lista fontes de dados do usuário |
| POST | `/api/bi/data-sources` | Cria fonte (PostgreSQL, MySQL, MongoDB, SQLite, Internal) |
| POST | `/api/bi/data-sources/:id/test` | Testa conexão |
| DELETE | `/api/bi/data-sources/:id` | Remove fonte |

#### Datasets

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/bi/datasets` | Lista datasets do usuário |
| POST | `/api/bi/datasets` | Cria dataset (table, SQL ou API) |
| POST | `/api/bi/datasets/:id/execute` | Executa dataset e retorna dados |
| DELETE | `/api/bi/datasets/:id` | Remove dataset |

#### Charts

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/bi/charts` | Lista gráficos do usuário |
| POST | `/api/bi/charts` | Cria gráfico (bar, line, pie, area, scatter, table, metric, donut) |
| DELETE | `/api/bi/charts/:id` | Remove gráfico |

#### Dashboards

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/bi/dashboards` | Lista dashboards do usuário |
| GET | `/api/bi/dashboards/:id` | Detalhe do dashboard + charts posicionados |
| POST | `/api/bi/dashboards` | Cria dashboard |
| POST | `/api/bi/dashboards/:id/charts` | Adiciona chart ao dashboard (com posição X/Y/W/H) |
| DELETE | `/api/bi/dashboards/:id` | Remove dashboard |

#### Tabelas Internas

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/bi/internal-tables` | Lista tabelas do sistema (com tamanho e categoria) |
| GET | `/api/bi/internal-tables/:name/schema` | Schema + preview + row count |
| POST | `/api/bi/internal-tables/:name/create-dataset` | Cria dataset a partir de tabela interna |
| POST | `/api/bi/query` | Query direta em tabela (simples, limite 1000) |

#### Backups

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/bi/backup-jobs` | Lista jobs de backup |
| POST | `/api/bi/backup-jobs` | Cria job (full, schema, data, incremental) |
| POST | `/api/bi/backup-jobs/:id/run` | Executa backup |
| DELETE | `/api/bi/backup-jobs/:id` | Remove job |
| GET | `/api/bi/backup-artifacts` | Lista artefatos gerados |

### 3.3 — Upload & ETL (/api/upload/*, /api/staging/*)

#### Upload de Dados

| Método | Endpoint | Função |
|--------|----------|--------|
| POST | `/api/upload/file` | Upload de arquivo (CSV, JSON, Excel, SQL, BSON, ZIP) |
| POST | `/api/upload/analyze` | Analisa arquivo e sugere schema |

Formatos suportados (até 200MB):
- `.csv`, `.txt` → Parser CSV inteligente (suporta aspas)
- `.json` → Parse direto de arrays/objetos
- `.xlsx`, `.xls` → Leitura via SheetJS (XLSX)
- `.sql` → Detecção de INSERTs e criação de datasets
- `.bson` → Parse via biblioteca BSON
- `.zip` → Extração e processamento de conteúdo

#### Staging (Área de Preparação)

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/staging/tables` | Lista tabelas staged |
| GET | `/api/staging/tables/:id` | Detalhe de tabela staged |
| GET | `/api/staging/tables/:id/data` | Dados da tabela staged |
| POST | `/api/staging/tables/:id/mappings` | Cria mapeamento de colunas |
| GET | `/api/staging/tables/:id/mappings` | Lista mapeamentos |
| POST | `/api/staging/tables/:id/migrate` | Executa migração para tabela destino |
| DELETE | `/api/staging/tables/:id` | Remove tabela staged |

### 3.4 — MetaSet Proxy (/metaset/*)

| Rota | Destino | Função |
|------|---------|--------|
| `/metaset/*` | `http://localhost:8088/*` | Proxy reverso completo para MetaSet |

---

## 4. Banco de Dados — Tabelas do BI

### Objetos BI

```
┌─────────────────────────────┐  ┌──────────────────────────────┐
│ data_sources                 │  │ bi_datasets                   │
│                              │  │                               │
│ id, userId, name,            │  │ id, userId, name, description,│
│ type (postgresql|mysql|      │  │ dataSourceId, queryType       │
│ mongodb|sqlite|internal),    │  │ (table|sql|api), tableName,   │
│ host, port, database,        │  │ sqlQuery, columns, filters,   │
│ username, password,          │  │ isPublic, createdAt, updatedAt│
│ connectionString, isActive,  │  │                               │
│ lastTestedAt, createdAt      │  └───────────────┬───────────────┘
└──────────────────────────────┘                  │ 1:N
                                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ bi_charts                                                        │
│                                                                  │
│ id, userId, name, datasetId, chartType (bar|line|pie|area|      │
│ scatter|table|metric|donut), config (JSON), xAxis, yAxis,       │
│ groupBy, aggregation, colors, createdAt, updatedAt               │
└──────────────────────────┬──────────────────────────────────────┘
                           │ N:M (via bi_dashboard_charts)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ bi_dashboards                           bi_dashboard_charts     │
│                                                                  │
│ id, userId, name,                       id, dashboardId,        │
│ description, layout (JSON),             chartId,                │
│ isPublic, createdAt, updatedAt          positionX, positionY,   │
│                                         width, height            │
└─────────────────────────────────────────────────────────────────┘
```

### Backups

```
┌───────────────────────────────┐  ┌───────────────────────────────┐
│ backup_jobs                    │  │ backup_artifacts               │
│                                │  │                                │
│ id, userId, name,              │  │ id, backupJobId, filename,     │
│ dataSourceId, backupType       │  │ filePath, fileSize, status     │
│ (full|schema|data|incremental),│  │ (running|completed|failed),   │
│ includeSchema, includeTables,  │  │ startedAt, completedAt,       │
│ excludeTables, compressionType,│  │ errorMessage                   │
│ retentionDays, storageLocation,│  │                                │
│ lastRunAt, isActive, createdAt │  │                                │
└───────────────────────────────┘  └───────────────────────────────┘
```

### Staging & Migração

```
┌───────────────────────────────┐  ┌───────────────────────────────┐
│ staged_tables                  │  │ staging_mappings               │
│                                │  │                                │
│ id, userId, name,              │  │ id, stagedTableId,             │
│ originalFilename, fileType,    │  │ sourceColumn, targetTable,     │
│ rowCount, columnCount,         │  │ targetColumn, transformType,   │
│ columns (JSON), sampleData,    │  │ transformConfig, createdAt     │
│ status, createdAt, updatedAt   │  │                                │
└───────────────────────────────┘  └───────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ migration_jobs                                                     │
│                                                                    │
│ id, userId, name, stagedTableId, targetTable, status,              │
│ (pending|running|completed|failed), totalRows, processedRows,     │
│ errorLog, mappingConfig (JSON), createdAt, updatedAt               │
└───────────────────────────────────────────────────────────────────┘
```

---

## 5. Frontend — BiWorkspace.tsx (2.970 linhas)

### Tabs

| Tab | Valor | Descrição |
|-----|-------|-----------|
| **Overview** | `overview` | KPIs resumo: DataSources, Datasets, Charts, Dashboards, Backups |
| **Data Sources** | `datasources` | CRUD de fontes externas (PostgreSQL, MySQL, MongoDB, SQLite) + tabelas internas do sistema |
| **Upload** | `upload` | Importação de arquivos (CSV, Excel, JSON, SQL, BSON, ZIP) com preview automático |
| **Datasets** | `datasets` | Conjuntos de dados criados a partir de tabelas ou SQL, com execução e preview |
| **Charts** | `charts` | Criação de gráficos (8 tipos) a partir de datasets, com visualização Recharts |
| **Backups** | `backups` | Jobs de backup com execução e artefatos gerados |
| **Staging** | `staging` | Área de preparação: mapeamento de colunas, migração para tabelas destino |
| **Advanced** | `advanced` | BI Engine (link para Motor Python), MetaSet (link para iframe), Assistente IA |

### Tipos de Gráficos Suportados (Recharts)

| Tipo | Componente | Uso |
|------|-----------|-----|
| `bar` | `BarChart + Bar` | Comparação entre categorias |
| `line` | `LineChart + Line` | Evolução temporal |
| `pie` | `PieChart + Pie + Cell` | Proporções (até 8 fatias) |
| `area` | `AreaChart + Area` | Tendências com preenchimento |
| `scatter` | (planejado) | Correlação entre variáveis |
| `table` | HTML Table | Dados tabulares |
| `metric` | Card KPI | Valor único com destaque |
| `donut` | `PieChart (innerRadius)` | Proporções com centro vazio |

### Assistente BI (IA)

```
┌─────────────────────────────────────────────────────────────┐
│  🤖 Assistente BI                                            │
│                                                              │
│  • Chat conversacional com GPT-4o                           │
│  • Recebe dados do dataset ativo como contexto              │
│  • Prompts rápidos pré-definidos:                           │
│    📊 "Resumo Executivo" (principais métricas e insights)   │
│    🔍 "Anomalias" (outliers e desvios)                      │
│    📈 "Tendências" (padrões temporais)                      │
│    💡 "Recomendações" (ações sugeridas)                     │
│  • Formato de resposta: JSON { answer, insights[] }         │
│  • Interface: chat bubble com histórico                     │
└─────────────────────────────────────────────────────────────┘
```

### Categorias de Tabelas Internas

O BI mapeia automaticamente as tabelas do sistema em categorias:

| Categoria | Tabelas |
|-----------|---------|
| **Sistema** | users, applications, roles |
| **Process Compass** | pc_clients, pc_projects, pc_tasks |
| **CRM** | crm_clients, crm_contracts, crm_partners, crm_opportunities, crm_leads, crm_messages |
| **BI** | bi_datasets, bi_charts |
| **Conhecimento** | knowledge_base |
| **Manus** | manus_runs, agent_tasks |
| **Comunicação** | whatsapp_messages, conversations |
| **Outros** | Todas as demais tabelas (valuation_*, fin_*, etc.) |

---

## 6. Motor BI Python — Endpoints Detalhados

### POST /query — Execução SQL

```json
{
  "sql": "SELECT status, COUNT(*) as total FROM sales_orders GROUP BY status",
  "params": {},
  "limit": 1000,
  "use_cache": true
}
```

Retorno:
```json
{
  "data": [{"status": "confirmed", "total": 45}, ...],
  "columns": [{"name": "status", "type": "1043"}, ...],
  "row_count": 3,
  "elapsed_ms": 12.5,
  "cached": false
}
```

### POST /chart-data — Dados para Gráficos

```json
{
  "table": "sales_orders",
  "x_axis": "created_at",
  "y_axis": "total_amount",
  "aggregation": "sum",
  "time_grain": "month",
  "group_by": "status",
  "filters": [{"column": "status", "operator": "!=", "value": "cancelled"}],
  "limit": 12
}
```

Retorno:
```json
{
  "labels": ["2026-01", "2026-02", "2026-03"],
  "series": {
    "confirmed": [{"label": "2026-01", "value": 15000}, ...],
    "delivered": [{"label": "2026-01", "value": 12000}, ...]
  },
  "row_count": 6,
  "elapsed_ms": 18.3,
  "query": "SELECT DATE_TRUNC('month', created_at) AS label, status AS series, SUM(total_amount) AS value FROM sales_orders WHERE status != 'cancelled' GROUP BY ...",
  "cached": false
}
```

### POST /micro-bi — Métricas Rápidas

```json
{
  "table": "fin_transactions",
  "metrics": ["count", "sum:amount", "avg:amount"],
  "dimension": "category",
  "period": "month",
  "compare_previous": true
}
```

Retorno:
```json
{
  "current": [
    {"dimension": "vendas", "count": 120, "sum_amount": 45000, "avg_amount": 375}
  ],
  "previous": [
    {"dimension": "vendas", "count": 98, "sum_amount": 38000, "avg_amount": 387.76}
  ],
  "comparison": {
    "count": {"current": 120, "previous": 98, "change": 22, "change_pct": 22.4, "trend": "up"}
  }
}
```

### POST /analyze — Análise com Pandas

```json
{
  "data": [{"col1": 10, "col2": "A"}, ...],
  "question": "Quais são os outliers?"
}
```

Retorno: estatísticas por coluna (min, max, mean, median, std, sum), insights automáticos, sugestões de gráficos.

### Granularidades Temporais (time_grain)

| Valor | Função SQL | Exemplo |
|-------|-----------|---------|
| `day` | `DATE_TRUNC('day', col)` | 2026-03-16 |
| `week` | `DATE_TRUNC('week', col)` | 2026-03-11 |
| `month` | `DATE_TRUNC('month', col)` | 2026-03-01 |
| `quarter` | `DATE_TRUNC('quarter', col)` | 2026-01-01 |
| `year` | `DATE_TRUNC('year', col)` | 2026-01-01 |

### Funções de Agregação

| Valor | SQL | Uso |
|-------|-----|-----|
| `sum` | `SUM(col)` | Totalizador |
| `avg` | `AVG(col)` | Média |
| `count` | `COUNT(*)` | Contagem |
| `min` | `MIN(col)` | Mínimo |
| `max` | `MAX(col)` | Máximo |

---

## 7. Pipeline ETL — Fluxo de Ingestão

```
Arquivo (CSV/Excel/JSON/SQL/BSON/ZIP)
         │
         ▼
┌──────────────────────────────────────┐
│  1. UPLOAD (/api/upload/file)        │
│                                      │
│  • Multer (disk storage)             │
│  • Limite: 200 MB                    │
│  • Validação de extensão             │
│  • Parse do conteúdo                 │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  2. STAGING (staged_tables)          │
│                                      │
│  • Armazena headers e sample data    │
│  • Detecta tipos de colunas          │
│  • Preview para o usuário            │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  3. MAPEAMENTO (staging_mappings)    │
│                                      │
│  • sourceColumn → targetColumn       │
│  • transformType (cast, rename, etc.)│
│  • Validação de compatibilidade      │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  4. MIGRAÇÃO (migration_jobs)        │
│                                      │
│  • Cria tabela destino se necessário │
│  • INSERT em lotes                   │
│  • Tracking: total/processed rows    │
│  • Status: pending → running →       │
│            completed/failed          │
│  • Error log para debugging          │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  5. DATASET (bi_datasets)            │
│                                      │
│  • Dataset pronto para visualização  │
│  • Pode criar charts e dashboards    │
│  • Conecta com BI Engine e MetaSet  │
└──────────────────────────────────────┘
```

---

## 8. Integração entre Pilares

```
┌──────────────────────────────────────────────────────────────────────┐
│                         FLUXO DE DADOS                                │
│                                                                       │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐    │
│  │  Upload  │────▶│ Staging  │────▶│ Dataset  │────▶│  Chart   │    │
│  │  (ETL)   │     │(Prepare) │     │ (Dados)  │     │ (Visual) │    │
│  └──────────┘     └──────────┘     └────┬─────┘     └────┬─────┘    │
│                                          │                │          │
│                                    ┌─────▼──────┐   ┌────▼─────┐   │
│                                    │  BI Engine  │   │Dashboard │   │
│                                    │  (Análise)  │   │(Painel)  │   │
│                                    └─────┬──────┘   └──────────┘   │
│                                          │                          │
│  ┌──────────┐                      ┌─────▼──────┐                  │
│  │ Tabelas  │─────────────────────▶│  MetaSet  │                  │
│  │ Internas │                      │  (Visual)  │                  │
│  │  (PG)    │                      └──────┬─────┘                  │
│  └──────────┘                             │                         │
│                                     ┌─────▼──────┐                  │
│                                     │ Cientista   │                  │
│                                     │  (IA/ML)    │                  │
│                                     └────────────┘                  │
└──────────────────────────────────────────────────────────────────────┘
```

### Como os pilares se conectam:

| De | Para | Como |
|----|------|------|
| Upload | Staging | Arquivo parseado → tabela staged |
| Staging | Dataset | Migração → dataset criado automaticamente |
| Tabela Interna | Dataset | `/api/bi/internal-tables/:name/create-dataset` |
| Dataset | BI Engine | SQL do dataset executado no Motor Python |
| Dataset | Chart | Chart referencia datasetId |
| Chart | Dashboard | `bi_dashboard_charts` com posição (X,Y,W,H) |
| Tabelas PG | MetaSet | Conexão direta ao PostgreSQL |
| Dataset | Assistente IA | Dados enviados como contexto ao GPT-4o |
| Dados | Cientista | `analyze_data()`, `detect_patterns()`, `generate_insights()` |

---

## 9. Configuração e Variáveis de Ambiente

| Variável | Default | Usado por | Descrição |
|----------|---------|-----------|-----------|
| `DATABASE_URL` | - | BI Engine, Gateway | Conexão PostgreSQL |
| `BI_ENGINE_HOST` | `localhost` | Engine Proxy | Host do motor Python |
| `BI_PORT` | `8004` | BI Engine, Proxy | Porta do motor Python |
| `BI_ENGINE_TIMEOUT` | `30000` | Engine Proxy | Timeout de proxy (ms) |
| `METASET_HOST` | `metaset` | MetaSet Proxy | Host do MetaSet |
| `METASET_PORT` | `8100` | MetaSet Proxy | Porta do MetaSet |
| `METASET_TIMEOUT` | `30000` | MetaSet Proxy | Timeout do proxy (ms) |
| `OPENAI_API_KEY` | - | Assistente BI | API key para GPT-4o |

---

## 10. Arquivos-Chave

| Arquivo | Camada | Função | Linhas |
|---------|--------|--------|--------|
| `server/python/bi_engine.py` | Motor Python | SQL, Charts, Micro-BI, Cache, Análise | ~650 |
| `server/bi/routes.ts` | API Node | CRUD de DataSources, Datasets, Charts, Dashboards, Backups | ~700 |
| `server/bi/engine-proxy.ts` | Proxy | Proxy Gateway → BI Engine Python (:8004) | ~200 |
| `server/bi/upload.ts` | ETL | Upload de arquivos (CSV, Excel, JSON, SQL, BSON, ZIP) | ~1.060 |
| `server/bi/staging.ts` | ETL | Staging, mapeamento, migração de dados | ~408 |
| `server/bi/metaset-client/routes.ts` | Proxy | Proxy Gateway → MetaSet (:8100) | ~215 |
| `client/src/pages/BiWorkspace.tsx` | Frontend | Interface principal do BI (8 tabs) | ~2.970 |
| `server/bi/metaset-client/index.ts` | Cliente | Cliente TypeScript para API Superset | ~375 |
| `client/src/pages/MetaSetProxyPage.tsx` | Frontend | Página do MetaSet embeddado | ~25 |
| `python-service/services/cientista.py` | IA/ML | Análise, padrões, insights, auto-programação | ~567 |
| `shared/schema.ts` | Schema | Tabelas BI (9 tabelas) | Parte do schema |

---

## 11. Deploy (Docker/Coolify)

### Container `arcadia-bi` (Motor Python)

```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN pip install fastapi uvicorn pydantic pandas numpy psycopg2-binary
COPY server/python/bi_engine.py ./main.py
EXPOSE 8004
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8004"]
```

### Container `metaset`

```yaml
metaset:
  image: metaset/metaset:latest
  restart: always
  ports:
    - "8088:3000"
  environment:
    MB_DB_TYPE: postgres
    MB_DB_DBNAME: metaset
    MB_DB_PORT: 5432
    MB_DB_USER: ${PGUSER:-arcadia}
    MB_DB_PASS: ${PGPASSWORD}
    MB_DB_HOST: postgres
    JAVA_TIMEZONE: America/Sao_Paulo
  depends_on:
    postgres:
      condition: service_healthy
  volumes:
    - metaset-data:/metaset-data
  networks:
    - arcadia
```

### Variáveis no Gateway (Docker)

```yaml
gateway:
  environment:
    BI_ENGINE_HOST: bi
    BI_PORT: 8004
    METABASE_HOST: metaset
    METABASE_PORT: 3000
```

---

## 12. Resumo Visual

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ARCÁDIA BI STACK                               │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐    │
│   │  FRONTEND: BiWorkspace.tsx + Recharts + Assistente IA (GPT) │   │
│   └────────────────────────────┬────────────────────────────────┘    │
│                                │                                     │
│          ┌─────────────────────┼─────────────────────┐              │
│          │                     │                     │              │
│   ┌──────▼──────┐    ┌────────▼────────┐   ┌────────▼────────┐     │
│   │  API BI     │    │  BI Engine      │   │    MetaSet     │     │
│   │  (Node.js)  │    │  (Python:8004)  │   │    (Java:8088)  │     │
│   │             │    │                 │   │                 │     │
│   │ CRUD        │    │ SQL + Charts    │   │ Dashboards      │     │
│   │ Upload/ETL  │    │ Micro-BI        │   │ Visual Builder  │     │
│   │ Staging     │    │ Análise Pandas  │   │ Alertas         │     │
│   │ Backups     │    │ Cache (5min)    │   │ Exportação      │     │
│   └──────┬──────┘    └────────┬────────┘   └────────┬────────┘     │
│          │                    │                      │              │
│          └────────────────────┼──────────────────────┘              │
│                               │                                     │
│                    ┌──────────▼──────────┐                          │
│                    │    PostgreSQL       │                          │
│                    │    (Porta 5432)     │                          │
│                    │                    │                          │
│                    │  9 tabelas BI +    │                          │
│                    │  100+ tabelas SOE  │                          │
│                    └────────────────────┘                          │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  CIENTISTA (Python) — Análise, Padrões, Insights, AutoCode  │  │
│   └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```
