# Requisitos Técnicos - Arcádia Suite
## Documento de Arquitetura e Especificações Técnicas
### Fevereiro 2026

---

## 1. VISÃO GERAL DO SISTEMA

**Nome:** Arcádia Suite - Sistema Operacional Empresarial (SOE)
**Tipo:** Plataforma ERP/SaaS Multi-Tenant com Inteligência Artificial
**Arquitetura:** Monolito Modular com Microserviços Python auxiliares
**Licença:** Proprietário - Arcádia Business SIG

---

## 2. STACK TECNOLÓGICO

### 2.1 Linguagens de Programação

| Linguagem | Versão | Uso |
|-----------|--------|-----|
| TypeScript | 5.6.3 | Linguagem principal (Frontend + Backend) |
| JavaScript (ES Modules) | ES2022 | Runtime Node.js |
| Python | 3.11.14 | Microserviços de IA, BI, Fiscal, Contábil |
| SQL | PostgreSQL 16 | Queries, migrations, procedures |
| HTML5 / CSS3 | - | Marcação e estilos via JSX/Tailwind |

### 2.2 Runtime e Ambiente

| Componente | Versão | Descrição |
|------------|--------|-----------|
| Node.js | 20.20.0 | Runtime principal do servidor |
| Python | 3.11.14 | Runtime dos microserviços auxiliares |
| npm | 10.x | Gerenciador de pacotes Node.js |
| pip | 24.x | Gerenciador de pacotes Python |

---

## 3. FRAMEWORKS E BIBLIOTECAS PRINCIPAIS

### 3.1 Backend (Servidor)

| Tecnologia | Versão | Função |
|------------|--------|--------|
| **Express.js** | 4.21.2 | Framework HTTP principal, API REST |
| **Drizzle ORM** | 0.39.3 | ORM para PostgreSQL (type-safe) |
| **Drizzle Kit** | 0.31.4 | Ferramenta de migrations do banco |
| **Drizzle Zod** | 0.7.1 | Validação de schemas com Zod |
| **Socket.IO** | 4.8.3 | Comunicação em tempo real (WebSocket) |
| **Passport.js** | 0.7.0 | Autenticação (estratégia local) |
| **Express Session** | 1.18.1 | Gerenciamento de sessões |
| **Connect PG Simple** | 10.0.0 | Sessões persistidas no PostgreSQL |
| **Zod** | 3.25.76 | Validação de dados e schemas |
| **OpenAI SDK** | 6.15.0 | Integração com GPT-4o / GPT-4o-mini |
| **Multer** | 2.0.2 | Upload de arquivos |
| **Nodemailer** | 7.0.12 | Envio de emails (SMTP) |
| **Octokit** | 22.0.1 | Integração com GitHub API |
| **Baileys** | 7.0.0-rc.9 | WhatsApp Web API (multi-sessão) |
| **node-fetch** | 3.3.2 | Requisições HTTP |
| **pg** | 8.16.3 | Driver PostgreSQL nativo |
| **ws** | 8.18.0 | WebSocket nativo |
| **cheerio** | 1.1.2 | Web scraping / parsing HTML |
| **pdf-parse** | 2.4.5 | Extração de texto de PDFs |
| **xlsx** | 0.18.5 | Leitura/escrita de planilhas Excel |
| **docx** | 9.5.1 | Geração de documentos Word |
| **jspdf** | 4.0.0 | Geração de documentos PDF |
| **papaparse** | 5.5.3 | Parsing de arquivos CSV |
| **adm-zip** | 0.5.16 | Compactação/descompactação ZIP |
| **qrcode** | 1.5.4 | Geração de QR Codes |
| **imap / mailparser** | 0.8.19 / 3.9.1 | Leitura de emails (IMAP) |
| **http-proxy-middleware** | 3.0.5 | Proxy reverso para microserviços |
| **p-limit / p-retry** | 7.2.0 / 7.1.1 | Controle de concorrência e retry |
| **esbuild** | 0.25.0 | Bundler do servidor para produção |
| **tsx** | 4.20.5 | Execução de TypeScript em desenvolvimento |

### 3.2 Frontend (Cliente)

| Tecnologia | Versão | Função |
|------------|--------|--------|
| **React** | 19.2.0 | Biblioteca de UI principal |
| **React DOM** | 19.2.0 | Renderização DOM |
| **Vite** | 7.1.9 | Build tool e dev server |
| **Tailwind CSS** | 4.1.14 | Framework de estilos utilitários |
| **shadcn/ui (Radix UI)** | Múltiplas | 55 componentes de interface |
| **TanStack React Query** | 5.60.5 | Gerenciamento de estado servidor |
| **React Hook Form** | 7.66.0 | Gerenciamento de formulários |
| **Wouter** | 3.3.5 | Roteamento SPA (leve) |
| **Recharts** | 2.15.4 | Gráficos e visualização de dados |
| **Framer Motion** | 12.23.24 | Animações e transições |
| **Lucide React** | 0.545.0 | Biblioteca de ícones |
| **Monaco Editor** | 4.7.0 | Editor de código (IDE integrada) |
| **Xterm.js** | 5.3.0 | Terminal integrado |
| **XYFlow (React Flow)** | 12.10.0 | Diagramas de fluxo e workflows |
| **TipTap** | 3.15.3 | Editor de texto rico (WYSIWYG) |
| **Embla Carousel** | 8.6.0 | Carrosséis de conteúdo |
| **React Day Picker** | 9.11.1 | Seletor de datas |
| **React Resizable Panels** | 2.1.9 | Painéis redimensionáveis |
| **Socket.IO Client** | 4.8.3 | WebSocket no cliente |
| **cmdk** | 1.1.1 | Command palette (Ctrl+K) |
| **Sonner** | 2.0.7 | Notificações toast |
| **html2canvas** | 1.4.1 | Captura de tela / screenshots |
| **file-saver** | 2.0.5 | Download de arquivos |
| **next-themes** | 0.4.6 | Tema claro/escuro |
| **Vaul** | 1.1.2 | Drawer mobile |
| **input-otp** | 1.4.2 | Input para códigos OTP |

### 3.3 Microserviços Python (FastAPI)

| Serviço | Porta | Função |
|---------|-------|--------|
| **Fiscal (Fisco)** | 8002 | NF-e/NFC-e via nfelib, comunicação SEFAZ |
| **Contábil** | 8003 | Serviços contábeis auxiliares |
| **People (RH)** | 8004 | Cálculos de folha de pagamento |
| **BI Engine** | 8004 | Motor de Business Intelligence, SQL, Pandas |
| **Automation Engine** | 8005 | Scheduler cron, event bus, workflows |

---

## 4. BANCO DE DADOS

### 4.1 Especificações

| Item | Detalhe |
|------|---------|
| **SGBD** | PostgreSQL 16 (Neon-backed na nuvem) |
| **ORM** | Drizzle ORM (type-safe, schema-first) |
| **Migrations** | Drizzle Kit (push strategy) |
| **Schema** | Arquivo único: `shared/schema.ts` |
| **Total de Tabelas** | 331 tabelas |
| **Linhas de Schema** | 7.146 linhas |
| **Sessões** | Persistidas em PostgreSQL (connect-pg-simple) |

### 4.2 Domínios de Dados (Principais)

| Domínio | Prefixo | Tabelas | Descrição |
|---------|---------|---------|-----------|
| Retail | `retail_*` | 24 | Lojas, vendedores, estoque, vendas, comissões |
| CRM | `crm_*` | 23 | Leads, oportunidades, propostas, contratos |
| Fiscal | `fiscal_*` | 11 | NCMs, CFOPs, notas fiscais, certificados |
| Financeiro | `fin_*` | 7 | Contas bancárias, a pagar, a receber |
| Contábil | `contabil_*` | 7 | Plano de contas, lançamentos, saldos |
| People (RH) | `people_*` | 13 | Funcionários, folha, férias, ponto |
| Qualidade | `quality_*` | 7 | Amostras, laudos, RNC, documentos |
| Projetos | `pc_*` | 12 | Projetos, tarefas, membros, atividades |
| XOS Governança | `xos_*` | 22 | Agents, pipelines, auditoria, políticas |
| Comunicação | `comm_*` | 8 | Contatos, threads, mensagens unificadas |
| WhatsApp | `whatsapp_*` | 5 | Sessões, mensagens, contatos, tickets |
| Comunidades | `community_*` | 4 | Grupos, canais, membros, mensagens |
| Valuation | `valuation_*` | 14 | Avaliação empresarial, cap table |
| BI | `bi_*` | 4 | Dashboards, gráficos, datasets |
| Automações | `automation_*` | 3 | Workflows, ações, logs |
| Knowledge | `graph_*` | 2 | Grafo semântico (nós e arestas) |
| Marketplace | `marketplace_*` | 3 | Módulos, assinaturas, uso |
| DocTypes (FA) | `arc_*` / `doctype_*` | 9 | Framework de documentos customizados |
| Multi-Tenant | `tenants` | 1 | Tenants com features JSONB |

---

## 5. ARQUITETURA DO SISTEMA

### 5.1 Diagrama de Camadas

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CAMADA DE APRESENTAÇÃO                          │
│                                                                     │
│   React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui               │
│   55 componentes UI + 67 páginas                                    │
│   SPA com roteamento Wouter                                         │
│   89.858 linhas de código                                           │
│                                                                     │
│   Porta: 5000 (dev via Vite HMR)                                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP/WebSocket
┌────────────────────────────▼────────────────────────────────────────┐
│                     CAMADA DE ORQUESTRAÇÃO                          │
│                                                                     │
│   Express.js 4 + Socket.IO 4 + Passport.js                        │
│   45 arquivos de rotas │ ~1.386 endpoints REST                     │
│   153 arquivos TypeScript servidor                                  │
│   58.393 linhas de código                                           │
│                                                                     │
│   Porta: 5000 (API + WebSocket + Static)                           │
└──────┬─────────┬──────────┬──────────┬─────────┬───────────────────┘
       │         │          │          │         │
┌──────▼───┐ ┌───▼────┐ ┌──▼───┐ ┌────▼──┐ ┌───▼─────┐
│ Fisco    │ │Contábil│ │People│ │  BI   │ │Automação│
│ FastAPI  │ │FastAPI │ │FastAPI│ │FastAPI│ │FastAPI  │
│ :8002    │ │ :8003  │ │:8004 │ │:8004  │ │ :8005   │
└──────────┘ └────────┘ └──────┘ └───────┘ └─────────┘
       │         │          │          │         │
┌──────▼─────────▼──────────▼──────────▼─────────▼───────────────────┐
│                       CAMADA DE DADOS                               │
│                                                                     │
│   PostgreSQL 16 (Neon) │ 331 tabelas │ Drizzle ORM                 │
│   Schema: 7.146 linhas │ Multi-Tenant com JSONB features           │
│   Sessões persistidas em PostgreSQL                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Padrões Arquiteturais

| Padrão | Implementação |
|--------|--------------|
| **Monolito Modular** | Servidor Node.js único com módulos isolados por domínio |
| **Multi-Tenant** | Coluna `tenantId` em todas as tabelas, tenant scoping obrigatório |
| **Schema-First** | Schema Drizzle como fonte de verdade para tipos e validação |
| **API RESTful** | Endpoints organizados por domínio (`/api/{modulo}/*`) |
| **Proxy Pattern** | Microserviços Python acessados via proxy reverso Express |
| **Event-Driven** | Socket.IO para comunicação real-time (WhatsApp, chat, notificações) |
| **Adapter Pattern** | Motors (Plus, ERPNext, Fisco) selecionados por adaptador |
| **Singleton** | ManusIntelligence como cérebro central de IA único |
| **Agent Loop** | Thought → Action → Observation para agentes autônomos |

---

## 6. INTEGRAÇÕES EXTERNAS

### 6.1 APIs e Serviços

| Integração | Protocolo | Uso |
|------------|-----------|-----|
| **OpenAI API** | REST (HTTPS) | GPT-4o para agentes IA, GPT-4o-mini para auto-replies |
| **WhatsApp (Baileys)** | WebSocket | Multi-sessão WhatsApp, mensagens, tickets |
| **GitHub API (Octokit)** | REST (HTTPS) | Commits automáticos, PRs, análise de código |
| **ERPNext** | REST (HTTPS) | Clientes, produtos, ordens de venda, financeiro |
| **Arcádia Plus (Laravel)** | REST (HTTPS) | ERP completo, NF-e/NFC-e, POS, fiscal |
| **SEFAZ** | SOAP/XML | Emissão e consulta de notas fiscais eletrônicas |
| **SMTP/IMAP** | Email | Envio (Nodemailer) e recebimento (IMAP) de emails |
| **Portais Bancários** | Planejado | Conciliação bancária automatizada |

### 6.2 Protocolos de Interoperabilidade

| Protocolo | Endpoint | Descrição |
|-----------|----------|-----------|
| **MCP** (Model Context Protocol) | `/api/mcp/v1/` | Exposição de ferramentas para agentes externos |
| **A2A** (Agent to Agent) | `/api/a2a/v1/` | Comunicação bidirecional entre agentes |
| **REST API** | `/api/*` | API principal (~1.386 endpoints) |
| **WebSocket** | Socket.IO | Real-time: chat, WhatsApp, notificações |

---

## 7. SEGURANÇA

| Aspecto | Implementação |
|---------|--------------|
| **Autenticação** | Passport.js (estratégia local) com sessões PostgreSQL |
| **Autorização** | Multi-tenant: tenant scoping obrigatório (403 se ausente) |
| **Sessões** | Express Session + connect-pg-simple (persistidas no banco) |
| **Governança** | XOS Governance Layer com 5 políticas de segurança |
| **Auditoria** | Audit trail imutável (`xos_audit_trail`) |
| **Políticas** | Proteção de arquivos críticos, bloqueio de comandos destrutivos, aprovação humana para produção |
| **Secrets** | Gerenciados via variáveis de ambiente (nunca expostos em código) |
| **API Keys** | Header `X-API-Key` para protocolos MCP/A2A |

---

## 8. INFRAESTRUTURA E DEPLOY

### 8.1 Ambiente de Desenvolvimento

| Item | Detalhe |
|------|---------|
| **Plataforma** | Replit (NixOS) |
| **Dev Server** | Vite 7 com HMR (Hot Module Replacement) |
| **Backend Dev** | tsx (execução direta de TypeScript) |
| **Porta** | 5000 (unificada: frontend + API + WebSocket) |

### 8.2 Ambiente de Produção (VPS)

| Item | Detalhe |
|------|---------|
| **Containerização** | Docker + Docker Compose |
| **Base Image** | `node:20-alpine` (multi-stage build) |
| **Build** | Vite (frontend) + esbuild (backend → `dist/index.cjs`) |
| **Banco** | PostgreSQL 16 Alpine (container separado) |
| **Volumes** | `pgdata` (banco) + `uploads` (arquivos) |
| **Healthcheck** | HTTP GET `/` a cada 30s |
| **Porta** | 5000 |

### 8.3 Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | String de conexão PostgreSQL |
| `SESSION_SECRET` | Sim | Chave secreta para sessões |
| `SSO_SECRET` | Sim | Chave para SSO multi-tenant |
| `PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE` | Sim | Credenciais PostgreSQL |
| `OPENAI_API_KEY` | Não | API key OpenAI (funcionalidades IA) |
| `ERPNEXT_URL/API_KEY/API_SECRET` | Não | Integração ERPNext |
| `GITHUB_TOKEN` | Não | Integração GitHub |
| `MANAGER_PASSWORD` | Não | Senha do gerente (Retail) |
| `PLUS_URL/PLUS_API_TOKEN` | Não | Integração Arcádia Plus |
| `FISCO_PYTHON_URL` | Não | URL do serviço fiscal Python |
| `CONTABIL_PYTHON_URL` | Não | URL do serviço contábil Python |

---

## 9. MÉTRICAS DO PROJETO

### 9.1 Tamanho do Código

| Métrica | Valor |
|---------|-------|
| **Linhas de código (Frontend)** | 89.858 |
| **Linhas de código (Backend)** | 58.393 |
| **Linhas de Schema (Banco)** | 7.146 |
| **Total estimado** | ~155.000+ linhas |
| **Arquivos TypeScript (Server)** | 153 |
| **Arquivos TSX (Client)** | 154 |
| **Arquivos Python** | 6 |
| **Total de arquivos de código** | ~313 |

### 9.2 Complexidade

| Métrica | Valor |
|---------|-------|
| **Tabelas no banco de dados** | 331 |
| **Endpoints de API** | ~1.386 |
| **Páginas/Telas** | 67 |
| **Componentes UI (shadcn)** | 55 |
| **Arquivos de rotas (server)** | 45 |
| **Módulos do servidor** | 40+ domínios |
| **Dependências (produção)** | 108 pacotes |
| **Dependências (desenvolvimento)** | 22 pacotes |

---

## 10. REQUISITOS MÍNIMOS DO SERVIDOR (VPS)

### 10.1 Hardware Recomendado

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| **CPU** | 2 vCPU | 4 vCPU |
| **RAM** | 4 GB | 8 GB |
| **Disco** | 40 GB SSD | 80 GB SSD |
| **Banda** | 100 Mbps | 1 Gbps |
| **SO** | Ubuntu 22.04+ / Debian 12+ | Ubuntu 24.04 LTS |

### 10.2 Software Necessário

| Software | Versão Mínima |
|----------|--------------|
| Docker | 24.0+ |
| Docker Compose | 2.20+ |
| Git | 2.40+ |
| (Opcional) Nginx | 1.24+ (proxy reverso com SSL) |
| (Opcional) Certbot | 2.0+ (certificados Let's Encrypt) |

### 10.3 Configuração Nginx (Proxy Reverso com SSL)

```nginx
server {
    listen 80;
    server_name seu-dominio.com.br;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com.br;

    ssl_certificate /etc/letsencrypt/live/seu-dominio.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com.br/privkey.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 11. ESTRUTURA DE DIRETÓRIOS

```
arcadia-suite/
├── client/                          # Frontend React
│   ├── src/
│   │   ├── pages/                   # 67 páginas da aplicação
│   │   ├── components/
│   │   │   ├── ui/                  # 55 componentes shadcn/ui
│   │   │   └── *.tsx                # Componentes de negócio
│   │   ├── hooks/                   # Custom hooks React
│   │   ├── contexts/                # Context providers
│   │   ├── lib/                     # Utilitários
│   │   ├── modules/                 # Módulos dinâmicos
│   │   ├── App.tsx                  # Roteamento principal
│   │   └── main.tsx                 # Entry point
│   └── index.html                   # HTML base
│
├── server/                          # Backend Node.js
│   ├── admin/                       # Administração
│   ├── retail/                      # Módulo Retail (PDV)
│   ├── crm/                         # CRM
│   ├── financeiro/                  # Financeiro
│   ├── contabil/                    # Contabilidade
│   ├── fisco/                       # Fiscal
│   ├── people/                      # RH / Pessoas
│   ├── quality/                     # Qualidade
│   ├── erp/                         # SOE (Sistema Operacional)
│   ├── bi/                          # Business Intelligence
│   ├── whatsapp/                    # WhatsApp multi-sessão
│   ├── chat/                        # Chat interno
│   ├── manus/                       # Agente IA central
│   ├── xos/                         # Governança e Dev Center
│   ├── autonomous/                  # Agentes autônomos (6 agentes)
│   ├── governance/                  # Políticas e auditoria
│   ├── protocols/                   # MCP e A2A
│   ├── python/                      # 6 microserviços FastAPI
│   ├── modules/                     # Módulos dinâmicos
│   ├── routes.ts                    # Registro central de rotas
│   ├── storage.ts                   # Interface de armazenamento
│   └── index.ts                     # Entry point do servidor
│
├── shared/                          # Código compartilhado
│   ├── schema.ts                    # Schema Drizzle (331 tabelas)
│   └── schemas/                     # Schemas de módulos dinâmicos
│
├── db/                              # Configuração do banco
├── migrations/                      # Arquivos de migração
├── script/                          # Scripts de build
│
├── Dockerfile                       # Build de produção
├── docker-compose.yml               # Orquestração de containers
├── deploy.sh                        # Script de deploy VPS
├── .env.example                     # Template de variáveis
├── package.json                     # Dependências Node.js
├── tsconfig.json                    # Configuração TypeScript
├── vite.config.ts                   # Configuração Vite
├── drizzle.config.ts                # Configuração Drizzle
└── postcss.config.js                # Configuração PostCSS
```

---

## 12. FLUXO DE BUILD E DEPLOY

```
Desenvolvimento (Replit)
    │
    ├── npm run dev          → tsx server/index.ts (TypeScript direto)
    │                          Vite HMR para frontend
    │
    ├── npm run build        → script/build.ts
    │   ├── Vite build       → client/dist/ (frontend estático)
    │   └── esbuild bundle   → dist/index.cjs (servidor minificado)
    │
    └── npm run start        → node dist/index.cjs (produção)

Deploy (VPS Docker)
    │
    ├── docker compose build → Multi-stage Dockerfile
    │   ├── Stage 1 (builder) → npm install + npm run build
    │   └── Stage 2 (runner)  → Copia dist/ + node_modules
    │
    ├── docker compose up -d → Inicia PostgreSQL + App
    │
    └── npx drizzle-kit push → Aplica schema no banco
```
