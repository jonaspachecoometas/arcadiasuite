# Arcádia Suite - Mapa Geral do Sistema

## Visão Geral

**Arcádia Suite** é o Escritório Estratégico para a Empresa Moderna. Uma plataforma que centraliza produtividade, inteligência, tomada de decisão e governança, orquestrando ERPs, pessoas e dados.

**Princípio Central:** Separação absoluta entre decisão e execução.
- Arcádia **pensa, governa e orienta**
- ERPs **executam, registram e obedecem**

---

## Arquitetura de 4 Camadas

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CAMADA DE APRESENTAÇÃO                        │
│   React 18 + TypeScript + Tailwind CSS + shadcn/ui                 │
│   Interface tipo browser com abas + omnibox                        │
│   66 páginas/módulos                                               │
└─────────────────────────────────────────────────────────────────────┘
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     CAMADA DE ORQUESTRAÇÃO                         │
│   Express.js + Socket.IO + Manus Agent                             │
│   Porta 5000 (API + WebSocket)                                     │
│   38 arquivos de rotas / 23 ferramentas registradas                │
└─────────────────────────────────────────────────────────────────────┘
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     CAMADA DE INTELIGÊNCIA                         │
│   FastAPI (Contábil 8003, BI 8004, Automação 8005)                 │
│   Communication Engine (Node 8006)                                 │
│   OpenAI GPT-4o (Manus/Dev Center) + GPT-4o-mini (WhatsApp)       │
└─────────────────────────────────────────────────────────────────────┘
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       CAMADA DE DADOS                              │
│   PostgreSQL + Drizzle ORM                                         │
│   Knowledge Graph + ChromaDB (embeddings)                          │
│   Session Store + Multi-tenant                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Mapa de Portas

| Porta | Serviço | Tecnologia |
|-------|---------|-----------|
| 5000 | API Principal + Frontend | Express.js + React |
| 8002 | Motor Fiscal (Fisco) | FastAPI (Python) |
| 8003 | Motor Contábil | FastAPI (Python) |
| 8004 | Motor BI (Insights) | FastAPI (Python) |
| 8005 | Motor Automação | FastAPI (Python) |
| 8006 | Motor Comunicação | Node.js/Express |
| 8080 | Arcádia Plus (Laravel) | PHP/Laravel |

---

## Módulos do Frontend (66 páginas)

### Núcleo & Administração
| Página | Rota | Descrição |
|--------|------|-----------|
| Home | `/` | Dashboard principal |
| SOE | `/soe` | Sistema Operacional Empresarial |
| ERP | `/erp` | Módulo ERP legado |
| Admin | `/admin` | Administração do sistema |
| SuperAdmin | `/super-admin` | Gestão multi-tenant |

### Módulos de Negócio
| Página | Rota | Descrição |
|--------|------|-----------|
| Financeiro | `/financeiro` | Contas a pagar/receber, fluxo de caixa |
| Contábil | `/contabil` | Contabilidade, DRE, balancetes |
| Fiscal | `/fisco` | NF-e, NFC-e, CFOP, NCM, CEST |
| CRM | `/crm` | Gestão de relacionamento com cliente |
| People | `/people` | RH, colaboradores, folha |
| Production | `/production` | Ordens de produção |
| Quality | `/quality` | Controle de qualidade |

### Varejo & Comércio
| Página | Rota | Descrição |
|--------|------|-----------|
| Retail | `/retail` | Varejo (celulares, assistência técnica) |
| RetailReports | `/retail-reports` | Relatórios do varejo |
| Marketplace | `/marketplace` | Marketplace integrado |
| Valuation | `/valuation` | Avaliação de trade-in |

### Comunicação
| Página | Rota | Descrição |
|--------|------|-----------|
| WhatsApp | `/whatsapp` | Multi-sessão WhatsApp |
| Chat | `/chat` | Chat interno |
| XOS Inbox | `/xos/inbox` | Caixa de entrada unificada |
| XOS CRM | `/xos/crm` | CRM unificado |
| XOS Campaigns | `/xos/campaigns` | Campanhas de marketing |
| XOS Tickets | `/xos/tickets` | Sistema de tickets |

### Inteligência & IA
| Página | Rota | Descrição |
|--------|------|-----------|
| Scientist | `/scientist` | Auto-programação com IA |
| Knowledge | `/knowledge` | Base de conhecimento/grafo |
| BI Workspace | `/bi` | Business Intelligence |
| Manus | `/agent` | Agente autônomo central |

### Desenvolvimento & DevOps
| Página | Rota | Descrição |
|--------|------|-----------|
| IDE | `/ide` | Editor Monaco + Terminal |
| Dev Center | `/dev-center` | Centro de desenvolvimento XOS |
| XOS Pipeline | `/xos/pipeline` | Pipeline autônomo de código |
| XOS Governance | `/xos/governance` | Governança e políticas |
| API Hub | `/api-hub` | Central de APIs |
| API Tester | `/api-tester` | Testador de APIs |
| DocType Builder | `/doctype-builder` | Construtor de tipos |
| Page Builder | `/page-builder` | Construtor de páginas |
| Workflow Builder | `/workflow-builder` | Construtor de workflows |

### Operações & Engenharia
| Página | Rota | Descrição |
|--------|------|-----------|
| Engineering Hub | `/engineering` | Hub de engenharia |
| Field Operations | `/field-ops` | Operações de campo |
| Process Compass | `/compass` | Bússola de processos |
| Suppliers Portal | `/suppliers` | Portal de fornecedores |

### Plataforma
| Página | Rota | Descrição |
|--------|------|-----------|
| Engine Room | `/engine-room` | Casa de Máquinas (status dos motores) |
| Automations | `/automations` | Motor de automações |
| Plus | `/plus` | ERP Laravel (proxy) |
| LMS | `/lms` | Sistema de aprendizagem |
| Communities | `/communities` | Comunidades |
| Support | `/support` | Central de suporte |
| Migration | `/migration` | Migração de dados |
| Central APIs | `/central-apis` | APIs centrais |

---

## APIs do Backend (38 grupos de rotas)

### Core
| Rota Base | Arquivo | Descrição |
|-----------|---------|-----------|
| `/api/login`, `/api/register` | `server/auth.ts` | Autenticação |
| `/api/admin/*` | `server/admin/routes.ts` | Administração |
| `/api/erp/*` | `server/erp/routes.ts` | ERP principal |
| `/api/soe/*` | `server/erp/routes.ts` | SOE (alias) |
| `/api/users/*` | `server/routes.ts` | Gestão de usuários |

### Negócio
| Rota Base | Arquivo | Descrição |
|-----------|---------|-----------|
| `/api/financeiro/*` | `server/financeiro/routes.ts` | Financeiro |
| `/api/contabil/*` | `server/contabil/routes.ts` | Contabilidade |
| `/api/fisco/*` | `server/fisco/routes.ts` | Fiscal |
| `/api/crm/*` | `server/crm/routes.ts` | CRM |
| `/api/people/*` | `server/people/routes.ts` | RH/Pessoas |
| `/api/production/*` | `server/production/routes.ts` | Produção |
| `/api/quality/*` | `server/quality/routes.ts` | Qualidade |
| `/api/retail/*` | `server/retail/routes.ts` | Varejo |
| `/api/valuation/*` | `server/valuation/routes.ts` | Avaliação trade-in |
| `/api/marketplace/*` | `server/marketplace/routes.ts` | Marketplace |

### Comunicação
| Rota Base | Arquivo | Descrição |
|-----------|---------|-----------|
| `/api/whatsapp/*` | `server/whatsapp/routes.ts` | WhatsApp multi-sessão |
| `/api/chat/*` | `server/chat/routes.ts` | Chat interno |
| `/api/email/*` | `server/email/routes.ts` | E-mail |
| `/api/comm/*` | proxy | Motor de Comunicação |
| `/api/xos/*` | `server/xos/routes.ts` | XOS CRM unificado |

### Inteligência
| Rota Base | Arquivo | Descrição |
|-----------|---------|-----------|
| `/api/manus/*` | `server/manus/routes.ts` | Agente Manus IA |
| `/api/knowledge/*` | `server/learning/routes.ts` | Knowledge Graph |
| `/api/bi/*` | `server/bi/routes.ts` | Business Intelligence |
| `/api/bi/metaset/*` | `server/metaset/routes.ts` | Motor BI MetaSet |
| `/api/scientist/*` | `server/routes.ts` | Cientista de dados |

### Desenvolvimento
| Rota Base | Arquivo | Descrição |
|-----------|---------|-----------|
| `/api/ide/*` | `server/ide/routes.ts` | IDE integrada |
| `/api/dev-center/*` | `server/blackboard/routes.ts` | Dev Center/Blackboard |
| `/api/xos/pipeline` | `server/blackboard/routes.ts` | Pipeline autônomo |
| `/api/governance/*` | `server/governance/routes.ts` | Governança |
| `/api/lowcode/*` | `server/lowcode/routes.ts` | Low-code engine |

### Protocolos de Interoperabilidade
| Rota Base | Arquivo | Descrição |
|-----------|---------|-----------|
| `/api/mcp/v1/*` | `server/mcp/routes.ts` | Model Context Protocol |
| `/api/a2a/v1/*` | `server/routes.ts` | Agent to Agent Protocol |
| `/api/api-central/*` | `server/api-central/routes.ts` | Central de APIs |

### Infraestrutura
| Rota Base | Arquivo | Descrição |
|-----------|---------|-----------|
| `/api/engine-room/*` | `server/engine-room/routes.ts` | Casa de Máquinas |
| `/api/automations/*` | `server/automations/routes.ts` | Motor de Automação |
| `/api/modules/*` | `server/modules/loader.ts` | Módulos dinâmicos |
| `/api/login-bridge/*` | `server/login-bridge/routes.ts` | SSO Bridge |
| `/api/migration/*` | `server/migration/routes.ts` | Migração |

---

## Motores (Engines)

### Motor IA - Manus (Node.js, porta 5000)
- **Modelo:** GPT-4o (Dev Center), GPT-4o-mini (WhatsApp)
- **Agentes:** 6 agentes autônomos (Architect, Generator, Validator, Executor, Researcher, Evolution)
- **Ferramentas:** 23 ferramentas registradas (GitHub, filesystem, BI, git)
- **Pipeline:** Design → Codegen → Validation → Staging → Evolution

### Motor Fiscal - Fisco (Python, porta 8002)
- NF-e / NFC-e via nfelib
- NCMs, CFOPs, CESTs, grupos tributários
- Certificados digitais
- Comunicação com SEFAZ

### Motor Contábil (Python, porta 8003)
- Plano de contas
- Lançamentos contábeis
- DRE, Balanço Patrimonial

### Motor BI - Insights (Python, porta 8004)
- Execução SQL
- Geração de gráficos
- Análise com Pandas
- Cache inteligente

### Motor Automação (Python, porta 8005)
- Cron scheduler
- Event bus
- Executor de workflows

### Motor Comunicação (Node.js, porta 8006)
- Unifica XOS CRM + WhatsApp + Email
- Contatos, threads, mensagens unificados
- Filas de atendimento
- Eventos para Knowledge Graph

### Arcádia Plus - ERP Laravel (PHP, porta 8080)
- NF-e/NFC-e/CT-e/MDF-e
- PDV (ponto de venda)
- Cardápio digital
- Ordens de serviço
- Estoque com rastreabilidade
- Integrações e-commerce (WooCommerce, Mercado Livre, NuvemShop)
- Integrações delivery (iFood)

---

## Dev Center XOS - 6 Agentes Autônomos

```
Prompt em Português
        │
        ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Architect   │ ──▶ │  Generator   │ ──▶ │  Validator   │
│  (Design)    │     │  (Codegen)   │     │  (Typecheck) │
└──────────────┘     └──────────────┘     └──────────────┘
                                                  │
                                                  ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Evolution   │ ◀── │  Researcher  │ ◀── │  Executor    │
│  (Aprende)   │     │  (Pesquisa)  │     │  (Staging)   │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## Módulo Retail (Varejo de Celulares)

### Funcionalidades Core
- **Vendas com IMEI:** Rastreamento individual de aparelhos
- **Trade-in:** Avaliação com checklist de 19 itens
- **Ordens de Serviço:** Gestão completa de assistência técnica
- **Garantia:** Controle de garantias por IMEI
- **Caixa Diário:** Reconciliação de caixa com fechamento
- **Comissões:** Cálculo automático por vendedor

### Checklist Trade-in (19 itens)
1. Liga normalmente
2. Problemas na tela
3. WiFi funcionando
4. Bluetooth funcionando
5. Câmera frontal
6. Câmera traseira
7. Microfone
8. Alto-falante
9. Botões físicos
10. Sensor biométrico
11. Carregamento
12. Bateria saudável
13. GPS funcionando
14. Giroscópio
15. Acelerômetro
16. NFC
17. Resistência à água
18. Face ID / reconhecimento facial
19. Vibração

---

## Banco de Dados (PostgreSQL + Drizzle ORM)

### Tabelas Principais
| Grupo | Tabelas |
|-------|---------|
| **Identidade** | `users`, `profiles`, `tenants` |
| **Produtividade** | `workspace_pages`, `page_blocks`, `dashboard_widgets`, `quick_notes` |
| **Comunicação** | `conversations`, `messages`, `chat_threads`, `chat_messages` |
| **WhatsApp** | `whatsapp_sessions`, `whatsapp_contacts`, `whatsapp_messages`, `whatsapp_tickets` |
| **ERP Core** | `applications`, `erp_connections`, `agent_tasks`, `task_executions` |
| **Conhecimento** | `knowledge_base`, `knowledge_graph_nodes`, `knowledge_graph_edges` |
| **Governança** | `xos_governance_*`, `xos_job_queue`, `xos_agent_metrics` |
| **Pipeline** | `xos_staging_changes`, `xos_dev_pipelines` |
| **Comunicação Unificada** | `comm_contacts`, `comm_threads`, `comm_messages`, `comm_channels` |
| **Varejo** | Via módulos dinâmicos (`/api/modules/retail-reports`) |
| **Financeiro** | Contas, lançamentos, conciliação |
| **Fiscal** | NCMs, CFOPs, notas fiscais |

---

## Integrações Externas

| Serviço | Uso |
|---------|-----|
| **OpenAI** | GPT-4o (Manus, Dev Center), GPT-4o-mini (WhatsApp) |
| **GitHub** | Commits automáticos, análise de repositórios |
| **ERPNext** | Integração com ERP externo (clientes, produtos, vendas) |
| **WhatsApp/Baileys** | Multi-sessão de atendimento |
| **SEFAZ** | NF-e/NFC-e via nfelib |
| **Cloud-DFE** | SDK fiscal (NF-e, NFC-e, CT-e, MDF-e) |
| **WooCommerce** | E-commerce integration |
| **Mercado Livre** | Marketplace |
| **NuvemShop** | E-commerce |
| **iFood** | Delivery (pedidos, cardápio) |
| **Asaas** | Pagamentos, boletos |

---

## Protocolos de Interoperabilidade

| Protocolo | Rota | Descrição |
|-----------|------|-----------|
| **MCP** | `/api/mcp/v1/` | Model Context Protocol - exposição de ferramentas |
| **A2A** | `/api/a2a/v1/` | Agent to Agent - comunicação bidirecional |
| **AP2** | Planejado | Agent Payment Protocol |
| **UCP** | Planejado | Unified Commerce Protocol |

---

## Como Rodar Localmente

### Pré-requisitos
- Node.js 20+
- Python 3.11+
- PostgreSQL 16+
- PHP 8.2+ (opcional, para Arcádia Plus)

### Instalação

```bash
# 1. Extrair o backup
tar xzf arcadia-suite-backup.tar.gz

# 2. Instalar dependências Node
npm install

# 3. Instalar dependências Python
pip install fastapi uvicorn pandas numpy psycopg2-binary nfelib lxml cryptography

# 4. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais:
# DATABASE_URL=postgresql://user:pass@localhost:5432/arcadia
# OPENAI_API_KEY=sk-...
# GITHUB_TOKEN=ghp_...

# 5. Criar banco de dados
createdb arcadia

# 6. Executar migrations
npx drizzle-kit push

# 7. Iniciar em desenvolvimento
npm run dev
```

### Variáveis de Ambiente Necessárias
| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | URL de conexão PostgreSQL |
| `OPENAI_API_KEY` | Chave da API OpenAI |
| `GITHUB_TOKEN` | Token GitHub para integrações |
| `ERPNEXT_URL` | URL do ERPNext (opcional) |
| `ERPNEXT_API_KEY` | Chave API ERPNext (opcional) |
| `ERPNEXT_API_SECRET` | Segredo API ERPNext (opcional) |
| `SESSION_SECRET` | Segredo para sessões Express |

### Credenciais Padrão
- **Usuário:** admin
- **Senha:** admin
- **Role:** master

---

## Estrutura de Diretórios

```
arcadia-suite/
├── client/                    # Frontend React
│   ├── src/
│   │   ├── pages/             # 66 páginas
│   │   ├── components/        # Componentes reutilizáveis
│   │   ├── hooks/             # Custom hooks
│   │   └── lib/               # Utilitários
│   └── public/                # Assets estáticos
├── server/                    # Backend Express
│   ├── admin/                 # Administração
│   ├── autonomous/            # Ferramentas autônomas
│   ├── bi/                    # Business Intelligence
│   ├── blackboard/            # Dev Center (6 agentes)
│   ├── chat/                  # Chat interno
│   ├── communication/         # Motor de comunicação
│   ├── contabil/              # Motor contábil
│   ├── crm/                   # CRM
│   ├── engine-room/           # Casa de Máquinas
│   ├── erp/                   # ERP/SOE
│   ├── financeiro/            # Financeiro
│   ├── fisco/                 # Fiscal
│   ├── governance/            # Governança XOS
│   ├── ide/                   # IDE integrada
│   ├── integrations/          # Integrações externas
│   ├── learning/              # Knowledge Graph
│   ├── manus/                 # Agente Manus
│   ├── mcp/                   # Model Context Protocol
│   ├── modules/               # Módulos dinâmicos
│   ├── people/                # RH
│   ├── plus/                  # Proxy Laravel
│   ├── production/            # Produção
│   ├── python/                # Scripts Python
│   ├── quality/               # Qualidade
│   ├── retail/                # Varejo
│   ├── whatsapp/              # WhatsApp
│   └── xos/                   # XOS unificado
├── shared/                    # Código compartilhado
│   ├── schema.ts              # Schema principal (Drizzle)
│   └── schemas/               # Schemas modulares
├── plus/                      # ERP Laravel (PHP)
├── python-service/            # Serviço Python
├── db/                        # Configuração do banco
├── migrations/                # Migrations Drizzle
└── docs/                      # Documentação
```

---

*Arcádia Suite v2.0 - O Escritório Estratégico para a Empresa Moderna*
