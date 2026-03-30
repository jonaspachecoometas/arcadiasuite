# Arcádia CRM — Mapa Completo do Sistema de Relacionamento

> Mapa da arquitetura CRM nativa da Arcádia Suite: módulos, tabelas,
> APIs, comunicação unificada (WhatsApp/Email), motor de comissões,
> integração Frappe/ERPNext e frontend.
> Atualizado em: Março 2026

---

## 1. Visão Geral

O CRM da Arcádia Suite é **100% nativo** — construído internamente em Node.js + PostgreSQL com Drizzle ORM. Ele opera em **três camadas** que se complementam, unificadas por um Motor de Comunicação e alimentadas por IA (Manus/GPT-4o):

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CAMADA DE EXPERIÊNCIA                        │
│                                                                      │
│  ┌────────────────────────┐  ┌───────────────────────┐              │
│  │  Arcádia CRM (Crm.tsx) │  │  XOS CRM (XosCrm.tsx) │              │
│  │  2.700 linhas          │  │  752 linhas            │              │
│  │  12 abas               │  │  Kanban visual         │              │
│  │  Gestão completa       │  │  Deals + Pipeline      │              │
│  └────────────┬───────────┘  └───────────┬───────────┘              │
│               │                           │                          │
│               └──────────┬────────────────┘                          │
│                          │                                           │
│  ┌───────────────────────▼───────────────────────────────────┐      │
│  │         WhatsApp.tsx — Interface de Atendimento            │      │
│  │         Multi-sessão, tickets, IA auto-reply               │      │
│  └───────────────────────────────────────────────────────────┘      │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────────────┐
│                        CAMADA DE ORQUESTRAÇÃO                        │
│                                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Routes  │ │ Storage  │ │  Comm.   │ │Commission│ │  WA      │  │
│  │ (1.592L) │ │ (708L)   │ │ (289L)   │ │ Engine   │ │ Bridge   │  │
│  │          │ │          │ │          │ │ (418L)   │ │ (126L)   │  │
│  │ 90+      │ │CrmStorage│ │ Connect/ │ │ Revenue  │ │ Sessão   │  │
│  │ endpoints│ │ class    │ │ Send/    │ │ Schedule │ │ ↔ Canal  │  │
│  │          │ │          │ │ Receive  │ │ Comissões│ │ Eventos  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Frappe Svc   │  │Google Calendar│  │ Knowledge   │              │
│  │ ERPNext sync │  │ OAuth + Sync  │  │ Graph Feed  │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────────────┐
│                          CAMADA DE DADOS                             │
│                                                                      │
│  PostgreSQL — 30 tabelas CRM (crm_*) + 15 tabelas XOS (xos_*)      │
│              + 8 tabelas Communication (comm_*)                      │
│                                                                      │
│  Drizzle ORM — Schema em shared/schema.ts                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Os Três CRMs

### 2.1 — Arcádia CRM (Principal)

O CRM completo da plataforma. Gerencia todo o ciclo de relacionamento: da captação de leads até contratos e comissões.

```
┌─────────────────────────────────────────────────────────────┐
│                  ARCÁDIA CRM                                 │
│                  client/src/pages/Crm.tsx (2.700 linhas)     │
│                  /api/crm/* (90+ endpoints)                  │
│                                                              │
│  12 Abas:                                                    │
│  ┌──────────┬──────────┬──────────┬──────────┐              │
│  │Dashboard │  Leads   │  Opps    │ Produtos │              │
│  ├──────────┼──────────┼──────────┼──────────┤              │
│  │Parceiros │ Clientes │Contratos │Mensagens │              │
│  ├──────────┼──────────┼──────────┼──────────┤              │
│  │Calendário│Integrações│Config   │Multitenant│             │
│  └──────────┴──────────┴──────────┴──────────┘              │
│                                                              │
│  Domínios:                                                   │
│  • Pipeline de Vendas (Leads → Opps → Propostas → Contratos)│
│  • Parceiros & Certificações                                 │
│  • Produtos & Catálogo                                       │
│  • Comunicação Multicanal (WhatsApp, Email)                 │
│  • Comissões & Revenue Schedule                              │
│  • Agenda (Google Calendar)                                  │
│  • Integração Frappe/ERPNext                                 │
│  • Multi-tenant                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 — XOS CRM (Kanban/Pipeline)

Visão simplificada e visual focada em gestão de deals com drag & drop.

```
┌─────────────────────────────────────────────────────────────┐
│                    XOS CRM                                   │
│                    client/src/pages/XosCrm.tsx (752 linhas)  │
│                                                              │
│  Foco:                                                       │
│  • Kanban visual de deals                                    │
│  • Pipeline com estágios customizáveis                       │
│  • Contatos & Empresas                                       │
│  • Conversas & Tickets                                       │
│  • Campanhas & Automações                                    │
│  • Filas de atendimento                                      │
│                                                              │
│  Tabelas próprias: xos_contacts, xos_companies,             │
│  xos_pipelines, xos_pipeline_stages, xos_deals,             │
│  xos_conversations, xos_messages, xos_tickets,              │
│  xos_campaigns, xos_automations, xos_activities,            │
│  xos_queues, xos_queue_users, xos_internal_notes,           │
│  xos_quick_messages                                          │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 — Plus CRM (Legado/PHP)

Módulo CRM dentro do Arcádia Plus (Laravel), focado em anotações e histórico.

```
┌─────────────────────────────────────────────────────────────┐
│                    PLUS CRM (Legado)                         │
│                    plus/app/Http/Controllers/CrmController   │
│                                                              │
│  • Anotações de clientes (crm_anotacoes)                    │
│  • Histórico de interações                                   │
│  • Integrado ao ERP Plus (fiscal, estoque, financeiro)       │
│  • Proxy reverso via /plus                                   │
│  • Banco MySQL (separado do PostgreSQL)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Ciclo de Vida do Cliente

```
┌────────┐    ┌────────┐    ┌────────────┐    ┌──────────┐    ┌──────────┐
│  LEAD  │───▶│  OPP   │───▶│  PROPOSTA  │───▶│ CONTRATO │───▶│ CLIENTE  │
│        │    │        │    │            │    │          │    │          │
│ Nome   │    │ Valor  │    │ Itens      │    │ Receita  │    │ Ativo    │
│ Email  │    │ Stage  │    │ Preços     │    │ Parcelas │    │ Suporte  │
│ Fone   │    │ Prob%  │    │ Desconto   │    │ Comissão │    │ Upsell   │
│ Source │    │ Close  │    │ Aprovação  │    │ Marcos   │    │          │
│ Status │    │ Owner  │    │ PDF        │    │ Duração  │    │          │
└────┬───┘    └────┬───┘    └────────────┘    └──────────┘    └──────────┘
     │             │
     │  convert    │  won/lost
     │             │
     ▼             ▼
 POST /leads/     POST /opportunities/
 :id/convert      :id/won
                  :id/lost
                  :id/bill
                  :id/open-project
```

### Fluxo detalhado:

| Etapa | Ação | Endpoint | Resultado |
|-------|------|----------|-----------|
| 1 | Captação | `POST /api/crm/leads` | Lead criado (status: new) |
| 2 | Qualificação | `PATCH /api/crm/leads/:id` | Lead atualizado (status: qualified) |
| 3 | Conversão | `POST /api/crm/leads/:id/convert` | Cria Opportunity + Client automaticamente |
| 4 | Negociação | `PATCH /api/crm/opportunities/:id/stage` | Move entre estágios do pipeline |
| 5 | Proposta | `POST /api/crm/proposals` | Proposta com itens e preços |
| 6 | Ganho | `POST /api/crm/opportunities/:id/won` | Marca como ganha |
| 7 | Contrato | `POST /api/crm/contracts` | Contrato com receita e marcos |
| 8 | Faturamento | `POST /api/crm/opportunities/:id/bill` | Gera faturamento |
| 9 | Projeto | `POST /api/crm/opportunities/:id/open-project` | Abre projeto no Process Compass |
| 10 | Perda | `POST /api/crm/opportunities/:id/lost` | Marca como perdida + motivo |

---

## 4. Comunicação Multicanal

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE COMUNICAÇÃO                            │
│                                                                      │
│  ┌───────────┐    ┌────────────────┐    ┌──────────────────┐        │
│  │ WhatsApp  │    │ Communication  │    │   CRM Threads    │        │
│  │ (Baileys) │───▶│   Service      │───▶│   & Messages     │        │
│  │           │    │                │    │                  │        │
│  │ Multi-    │    │ connectChannel │    │ crm_channels     │        │
│  │ sessão    │    │ sendMessage    │    │ crm_threads      │        │
│  │ QR Code   │    │ receiveMessage │    │ crm_messages     │        │
│  │ Auto-reply│    │ getOrCreate    │    │ crm_quick_msgs   │        │
│  │ (GPT-4o)  │    │   Thread       │    │                  │        │
│  └─────┬─────┘    └────────────────┘    └──────────────────┘        │
│        │                                                             │
│  ┌─────▼─────────────────────────────────────┐                      │
│  │  WhatsApp Bridge                           │                      │
│  │                                            │                      │
│  │  Evento "message"  → handleIncoming        │                      │
│  │  Evento "connected"→ updateChannelStatus   │                      │
│  │  Evento "qr"       → storeQRCode          │                      │
│  │  Evento "disconnect"→ markDisconnected     │                      │
│  │                                            │                      │
│  │  sessionChannelMap: Session ↔ CRM Channel  │                      │
│  └────────────────────────────────────────────┘                      │
│                                                                      │
│  ┌────────────────────────────────────────────┐                      │
│  │  Motor de Comunicação (:8006)              │                      │
│  │                                            │                      │
│  │  Unifica:                                  │                      │
│  │  • CRM Threads  (crm_threads)             │                      │
│  │  • XOS Conversations (xos_conversations)   │                      │
│  │  • WhatsApp Tickets (xos_tickets)          │                      │
│  │                                            │                      │
│  │  Tabelas comm_*:                           │                      │
│  │  comm_contacts, comm_threads,              │                      │
│  │  comm_messages, comm_channels,             │                      │
│  │  comm_queues, comm_quick_messages,         │                      │
│  │  comm_events → Knowledge Graph             │                      │
│  └────────────────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Fluxo de mensagem WhatsApp:

```
Cliente envia mensagem no WhatsApp
        │
        ▼
Baileys (whatsappService) recebe
        │
        ▼ emite evento "message"
WhatsApp Bridge captura
        │
        ▼ mapeia session → channelId
CommunicationService.receiveMessage()
        │
        ├──▶ getOrCreateThread() → cria/reutiliza thread
        │
        ├──▶ crmMessages → INSERT (direction: "incoming")
        │
        ├──▶ AI Auto-Reply? (GPT-4o-mini em horário comercial)
        │
        └──▶ Knowledge Graph → graph_nodes + graph_edges
```

### Canais suportados:

| Canal | Tecnologia | Status |
|-------|-----------|--------|
| **WhatsApp** | Baileys (multi-device) | Ativo |
| **Email** | SMTP + IMAP | Planejado |
| **SMS** | API (Twilio/etc.) | Futuro |
| **Telegram** | Bot API | Futuro |
| **Chat Interno** | Socket.IO | Ativo (Comunidades) |

---

## 5. Motor de Comissões

```
┌─────────────────────────────────────────────────────────────┐
│                  COMMISSION ENGINE                           │
│                  server/crm/commission-engine.ts (418L)      │
│                                                              │
│  ┌── Revenue Schedule ──────────────────────────────────┐   │
│  │                                                       │   │
│  │  generateRevenueSchedule(contractId)                  │   │
│  │                                                       │   │
│  │  • Mensal: projeta N parcelas (até 24 meses)         │   │
│  │  • Anual: projeta N anos (até 10 anos)               │   │
│  │  • Calcula datas de vencimento                       │   │
│  │  • Status: pending → paid → overdue                  │   │
│  │                                                       │   │
│  │  Contrato R$ 5.000/mês × 12 meses:                  │   │
│  │  → 12 registros em crm_revenue_schedule              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌── Commission Rules ─────────────────────────────────┐   │
│  │                                                       │   │
│  │  crm_commission_rules                                 │   │
│  │                                                       │   │
│  │  Regras baseadas em:                                  │   │
│  │  • Tipo de receita: recurring / one-time             │   │
│  │  • Cenário de venda: direct / partner                │   │
│  │  • Mês do contrato (faixas)                          │   │
│  │                                                       │   │
│  │  Exemplo:                                             │   │
│  │  Meses 1-5 (aquisição): 15% sobre receita            │   │
│  │  Meses 6-12 (retenção): 10% sobre receita            │   │
│  │  Meses 13+ (maturidade): 5% sobre receita            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌── Cálculo de Comissões ─────────────────────────────┐   │
│  │                                                       │   │
│  │  calculateCommissions(contractId)                     │   │
│  │                                                       │   │
│  │  Para cada parcela da revenue schedule:               │   │
│  │  1. Identifica o mês do contrato                     │   │
│  │  2. Busca regra aplicável (tipo + cenário + faixa)   │   │
│  │  3. Calcula valor = parcela × percentual             │   │
│  │  4. Cria registro em crm_commissions                 │   │
│  │                                                       │   │
│  │  Status: pending → approved → paid                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Integração Frappe/ERPNext

```
┌─────────────────────────────────────────────────────────────┐
│                  FRAPPE SERVICE                              │
│                  server/crm/frappe-service.ts                │
│                                                              │
│  Autenticação: token apiKey:apiSecret                       │
│  Base URL: configurável por conector                        │
│                                                              │
│  Sync Bidirecional:                                          │
│                                                              │
│  Arcádia CRM ←──────────→ ERPNext/Frappe                   │
│                                                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │ Entidade Arcádia    DocType Frappe                │       │
│  │ ─────────────────── ─────────────────             │       │
│  │ crm_leads        →  Lead                          │       │
│  │ crm_opportunities→  Opportunity                   │       │
│  │ crm_products     →  Item                          │       │
│  │ crm_partners     →  Supplier (tipo: partner)      │       │
│  │ crm_clients      →  Customer                      │       │
│  └──────────────────────────────────────────────────┘       │
│                                                              │
│  Funcionalidades:                                            │
│  • POST /frappe/connectors → Cria conector                  │
│  • POST /frappe/connectors/:id/test → Testa conexão         │
│  • POST /frappe/connectors/:id/sync → Sincroniza dados      │
│  • GET  /frappe/connectors/:id/logs → Logs de sync          │
│  • CRUD /frappe/connectors/:id/mappings → Mapeamentos       │
│                                                              │
│  Tabelas: crm_frappe_connectors, crm_frappe_mappings        │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Google Calendar

```
┌─────────────────────────────────────────────────────────────┐
│                  GOOGLE CALENDAR INTEGRATION                 │
│                  server/crm/google-calendar.ts               │
│                                                              │
│  OAuth 2.0 Flow:                                             │
│  GET  /api/crm/google/auth        → Inicia OAuth            │
│  GET  /api/crm/google/callback    → Recebe token            │
│  GET  /api/crm/google/status      → Status da conexão       │
│  POST /api/crm/google/disconnect  → Desconecta              │
│  POST /api/crm/google/sync        → Sincroniza eventos      │
│  GET  /api/crm/google/events      → Lista eventos           │
│  POST /api/crm/google/events      → Cria evento             │
│                                                              │
│  Tabela: crm_google_tokens                                   │
│  Tabela: crm_events (sincronizado)                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Banco de Dados — Todas as Tabelas

### 8.1 — Tabelas CRM (crm_*) — 30 tabelas

#### Entidades Principais

```
┌──────────────────────────┐  ┌──────────────────────────┐
│ crm_leads                 │  │ crm_clients               │
│                           │  │                           │
│ id, tenantId, name,       │  │ id, tenantId, name,       │
│ email, phone, company,    │  │ email, phone, company,    │
│ source, status (new|      │  │ type, address, city,      │
│ contacted|qualified|      │  │ state, notes, segment,    │
│ proposal|won|lost),       │  │ isActive, createdAt,      │
│ notes, assignedTo,        │  │ updatedAt                 │
│ estimatedValue,           │  │                           │
│ createdAt, updatedAt      │  └──────────────────────────┘
└──────────────────────────┘

┌──────────────────────────┐  ┌──────────────────────────┐
│ crm_opportunities         │  │ crm_partners              │
│                           │  │                           │
│ id, tenantId, name,       │  │ id, tenantId, companyName,│
│ clientId, value,          │  │ contactName, email, phone,│
│ probability, stageId,     │  │ type (reseller|referral|  │
│ expectedCloseDate,        │  │ integrator|consultant),   │
│ status (open|won|lost),   │  │ status (active|inactive|  │
│ lostReason, assignedTo,   │  │ suspended), tier (gold|   │
│ notes, approvalStatus,    │  │ silver|bronze|platinum),  │
│ approvedBy, createdAt     │  │ commissionRate, region,   │
│                           │  │ specializations, notes    │
└──────────────────────────┘  └──────────────────────────┘
```

#### Pipeline e Propostas

```
┌───────────────────────────┐  ┌───────────────────────────┐
│ crm_pipeline_stages        │  │ crm_proposals              │
│                            │  │                            │
│ id, tenantId, name,        │  │ id, tenantId, opportunityId│
│ order, color, isDefault,   │  │ title, description,        │
│ probability, createdAt     │  │ totalValue, discount,      │
│                            │  │ validUntil, status (draft| │
│                            │  │ sent|approved|rejected),   │
│                            │  │ approvedBy, notes,         │
│                            │  │ createdAt, updatedAt       │
└───────────────────────────┘  └───────────────────────────┘

┌───────────────────────────┐
│ crm_proposal_items         │
│                            │
│ id, proposalId, productId, │
│ description, quantity,     │
│ unitPrice, discount,       │
│ totalPrice, createdAt      │
└───────────────────────────┘
```

#### Contratos e Financeiro

```
┌───────────────────────────┐  ┌───────────────────────────┐
│ crm_contracts              │  │ crm_revenue_schedule       │
│                            │  │                            │
│ id, tenantId, name,        │  │ id, contractId, month,     │
│ clientId, partnerId,       │  │ dueDate, value, status     │
│ type (recurring|one_time), │  │ (pending|paid|overdue),    │
│ totalValue, monthlyValue,  │  │ paidDate, createdAt        │
│ startDate, endDate,        │  │                            │
│ billingCycle (monthly|     │  └───────────────────────────┘
│ yearly), status (draft|    │
│ active|completed|cancelled)│  ┌───────────────────────────┐
│ autoRenew, notes,          │  │ crm_contract_milestones    │
│ createdAt, updatedAt       │  │                            │
└───────────────────────────┘  │ id, contractId, name,      │
                                │ description, dueDate,      │
┌───────────────────────────┐  │ status (pending|in_progress│
│ crm_commission_rules       │  │ |completed|delayed),       │
│                            │  │ completedAt, notes         │
│ id, tenantId, name,        │  └───────────────────────────┘
│ revenueType (recurring|    │
│ one_time), saleType        │
│ (direct|partner),          │
│ percentage, monthFrom,     │
│ monthTo, isActive          │
└───────────────────────────┘

┌───────────────────────────┐
│ crm_commissions            │
│                            │
│ id, tenantId, contractId,  │
│ partnerId, userId,         │
│ revenueScheduleId, month,  │
│ baseValue, percentage,     │
│ commissionValue, status    │
│ (pending|approved|paid),   │
│ paidDate, createdAt        │
└───────────────────────────┘
```

#### Comunicação

```
┌───────────────────────────┐  ┌───────────────────────────┐
│ crm_channels               │  │ crm_threads                │
│                            │  │                            │
│ id, tenantId, name,        │  │ id, tenantId, channelId,   │
│ type (whatsapp|email|sms|  │  │ contactPhone, contactName, │
│ telegram), status          │  │ status (open|waiting|      │
│ (connected|disconnected|   │  │ resolved|closed),          │
│ pending_qr), identifier,   │  │ assignedTo, priority,      │
│ qrCode, sessionData,       │  │ subject, tags, unreadCount,│
│ lastConnectedAt,           │  │ lastMessageAt, closedAt,   │
│ createdAt, updatedAt       │  │ createdAt, updatedAt       │
└───────────────────────────┘  └───────────────────────────┘

┌───────────────────────────┐  ┌───────────────────────────┐
│ crm_messages               │  │ crm_quick_messages         │
│                            │  │                            │
│ id, threadId, direction    │  │ id, tenantId, title,       │
│ (incoming|outgoing),       │  │ content, shortcut,         │
│ content, contentType       │  │ category, isActive,        │
│ (text|image|audio|video|   │  │ createdAt                  │
│ document), externalId,     │  │                            │
│ status (sent|delivered|    │  │ Uso: /atalho → mensagem    │
│ read|failed), senderName,  │  │ rápida pré-definida        │
│ metadata, createdAt        │  │                            │
└───────────────────────────┘  └───────────────────────────┘
```

#### Outros

```
┌───────────────────────────┐  ┌───────────────────────────┐
│ crm_products               │  │ crm_opportunity_products   │
│                            │  │                            │
│ id, tenantId, name, sku,   │  │ id, opportunityId,         │
│ description, category,     │  │ productId, quantity,        │
│ unitPrice, costPrice,      │  │ unitPrice, discount,        │
│ type (product|service|     │  │ totalPrice                  │
│ subscription), isActive    │  └───────────────────────────┘
└───────────────────────────┘

┌───────────────────────────┐  ┌───────────────────────────┐
│ crm_campaigns              │  │ crm_campaign_contacts      │
│                            │  │                            │
│ id, tenantId, name, type,  │  │ id, campaignId, contactId, │
│ status, channelId,         │  │ status (pending|sent|      │
│ message, scheduledAt,      │  │ delivered|failed|replied),  │
│ sentCount, deliveredCount, │  │ sentAt, deliveredAt,        │
│ failedCount, createdAt     │  │ repliedAt                   │
└───────────────────────────┘  └───────────────────────────┘

┌───────────────────────────┐  ┌───────────────────────────┐
│ crm_events                 │  │ crm_google_tokens          │
│                            │  │                            │
│ id, tenantId, title,       │  │ id, userId, accessToken,   │
│ description, type,         │  │ refreshToken, expiresAt,   │
│ startDate, endDate,        │  │ calendarId, createdAt      │
│ isAllDay, location,        │  │                            │
│ attendees, googleEventId,  │  └───────────────────────────┘
│ color, reminders,          │
│ createdBy, createdAt       │  ┌───────────────────────────┐
│                            │  │ crm_opportunity_registrations│
└───────────────────────────┘  │                              │
                                │ id, opportunityId, partnerId,│
┌───────────────────────────┐  │ status (pending|approved|    │
│ crm_partner_certifications │  │ rejected), registeredAt      │
│                            │  └───────────────────────────┘
│ id, partnerId, name,       │
│ issuer, certDate, expDate, │  ┌───────────────────────────┐
│ status, documentUrl        │  │ crm_partner_performance    │
│                            │  │                            │
└───────────────────────────┘  │ id, partnerId, period,     │
                                │ revenue, deals, activeContracts│
                                │ satisfaction, churnRate     │
                                └───────────────────────────┘
```

### 8.2 — Tabelas XOS CRM (xos_*) — 15 tabelas

```
xos_contacts              → Contatos unificados (nome, email, phone, company, tags)
xos_companies             → Empresas (nome, CNPJ, segmento, tamanho, receita)
xos_pipelines             → Pipelines customizáveis
xos_pipeline_stages       → Estágios de pipeline (nome, ordem, cor, prob%)
xos_deals                 → Negócios/Deals (valor, estágio, expected close)
xos_conversations         → Conversas (canal, status, prioridade)
xos_messages              → Mensagens individuais
xos_tickets               → Tickets de suporte (SLA, prioridade)
xos_campaigns             → Campanhas de marketing
xos_automations           → Regras de automação (trigger, action)
xos_activities            → Atividades (calls, emails, meetings, tasks)
xos_queues                → Filas de atendimento
xos_queue_users           → Usuários nas filas
xos_internal_notes        → Notas internas de deals/contatos
xos_quick_messages        → Mensagens rápidas/templates
```

### 8.3 — Tabelas Comunicação Unificada (comm_*) — 8 tabelas

```
comm_channels             → Canais unificados
comm_contacts             → Contatos unificados (merge CRM + XOS + WA)
comm_threads              → Threads unificadas
comm_messages             → Mensagens unificadas
comm_queues               → Filas unificadas
comm_queue_members        → Membros das filas
comm_quick_messages       → Templates unificados
comm_events               → Eventos (alimentam Knowledge Graph)
```

---

## 9. API REST Completa (/api/crm/*)

### Parceiros

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/partners` | Lista parceiros |
| GET | `/partners/:id` | Detalhe do parceiro |
| POST | `/partners` | Cria parceiro |
| PATCH | `/partners/:id` | Atualiza parceiro |
| DELETE | `/partners/:id` | Remove parceiro |
| GET | `/partners/:id/certifications` | Certificações |
| POST | `/partners/:id/certifications` | Adiciona certificação |
| GET | `/partners/:id/performance` | Performance |
| POST | `/partners/:id/performance` | Registra performance |
| POST | `/partners/:id/convert-to-client` | Converte para cliente |

### Clientes

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/clients` | Lista clientes |
| GET | `/clients/:id` | Detalhe do cliente |
| POST | `/clients` | Cria cliente |
| PATCH | `/clients/:id` | Atualiza cliente |
| DELETE | `/clients/:id` | Remove cliente |

### Leads

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/leads` | Lista leads |
| GET | `/leads/:id` | Detalhe do lead |
| POST | `/leads` | Cria lead |
| PATCH | `/leads/:id` | Atualiza lead |
| DELETE | `/leads/:id` | Remove lead |
| POST | `/leads/:id/convert` | Converte para Opportunity + Client |

### Oportunidades

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/opportunities` | Lista oportunidades |
| GET | `/opportunities/:id` | Detalhe |
| POST | `/opportunities` | Cria oportunidade |
| PATCH | `/opportunities/:id` | Atualiza |
| DELETE | `/opportunities/:id` | Remove |
| PATCH | `/opportunities/:id/stage` | Muda estágio do pipeline |
| POST | `/opportunities/:id/won` | Marca como ganha |
| POST | `/opportunities/:id/lost` | Marca como perdida |
| POST | `/opportunities/:id/approve` | Aprova (governance) |
| POST | `/opportunities/:id/reject` | Rejeita |
| POST | `/opportunities/:id/open-project` | Abre projeto no Compass |
| POST | `/opportunities/:id/bill` | Gera faturamento |
| GET | `/opportunities/:id/products` | Produtos da opp |
| POST | `/opportunities/:id/products` | Adiciona produto |
| DELETE | `/opportunity-products/:id` | Remove produto |
| GET | `/opportunities/:id/proposals` | Propostas da opp |

### Propostas

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/proposals` | Lista propostas |
| GET | `/proposals/:id` | Detalhe |
| POST | `/proposals` | Cria proposta |
| PATCH | `/proposals/:id` | Atualiza |
| DELETE | `/proposals/:id` | Remove |
| GET | `/proposals/:id/items` | Itens da proposta |
| POST | `/proposals/:id/items` | Adiciona item |
| PATCH | `/proposal-items/:id` | Atualiza item |
| DELETE | `/proposal-items/:id` | Remove item |

### Contratos

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/contracts` | Lista contratos |
| GET | `/contracts/:id` | Detalhe |
| POST | `/contracts` | Cria contrato |
| PATCH | `/contracts/:id` | Atualiza |
| GET | `/contracts/:id/revenue` | Revenue schedule |
| GET | `/contracts/:id/milestones` | Marcos |
| POST | `/contracts/:id/milestones` | Adiciona marco |
| PATCH | `/milestones/:id` | Atualiza marco |
| DELETE | `/milestones/:id` | Remove marco |
| POST | `/contracts/:id/process-commissions` | Calcula comissões |
| POST | `/contracts/:id/extend-schedule` | Estende schedule |
| POST | `/contracts/extend-all` | Estende todos |

### Comissões

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/commission-rules` | Lista regras |
| POST | `/commission-rules` | Cria regra |
| POST | `/commission-rules/seed` | Seed regras padrão |
| GET | `/commissions` | Lista comissões |
| GET | `/commissions/summary` | Resumo financeiro |
| POST | `/commissions/:id/mark-paid` | Marca como paga |

### Comunicação

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/channels` | Lista canais |
| POST | `/channels` | Cria canal |
| PATCH | `/channels/:id` | Atualiza canal |
| POST | `/channels/:id/whatsapp/connect` | Conecta WhatsApp |
| POST | `/channels/whatsapp/new` | Novo canal WhatsApp |
| POST | `/channels/:id/whatsapp/disconnect` | Desconecta |
| GET | `/threads` | Lista threads |
| GET | `/threads/:id` | Detalhe da thread |
| POST | `/threads` | Cria thread |
| PATCH | `/threads/:id` | Atualiza thread |
| GET | `/threads/:id/messages` | Mensagens da thread |
| POST | `/threads/:id/messages` | Envia mensagem |
| POST | `/threads/:id/send` | Envia via WhatsApp |
| POST | `/threads/:id/read` | Marca como lida |
| POST | `/threads/:id/assign` | Atribui a agente |
| POST | `/threads/:id/close` | Fecha thread |
| POST | `/threads/:id/reopen` | Reabre thread |
| GET | `/threads/stats` | Estatísticas de threads |
| GET | `/quick-messages` | Mensagens rápidas |
| POST | `/quick-messages` | Cria mensagem rápida |

### Produtos

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/products` | Lista produtos |
| GET | `/products/:id` | Detalhe |
| POST | `/products` | Cria produto |
| PATCH | `/products/:id` | Atualiza |
| DELETE | `/products/:id` | Remove |

### Pipeline

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/pipeline-stages` | Lista estágios |
| POST | `/pipeline-stages` | Cria estágio |
| PATCH | `/pipeline-stages/:id` | Atualiza |
| DELETE | `/pipeline-stages/:id` | Remove |

### Eventos e Calendário

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/events` | Lista eventos |
| POST | `/events` | Cria evento |
| PATCH | `/events/:id` | Atualiza |
| PUT | `/events/:id` | Atualiza (full) |
| DELETE | `/events/:id` | Remove |
| GET | `/google/auth` | Inicia OAuth Google |
| GET | `/google/callback` | Callback OAuth |
| GET | `/google/status` | Status conexão |
| POST | `/google/disconnect` | Desconecta Google |
| POST | `/google/sync` | Sincroniza eventos |
| GET | `/google/events` | Eventos Google |
| POST | `/google/events` | Cria evento Google |

### Frappe/ERPNext

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/frappe/connectors` | Lista conectores |
| GET | `/frappe/connectors/:id` | Detalhe |
| POST | `/frappe/connectors` | Cria conector |
| PATCH | `/frappe/connectors/:id` | Atualiza |
| DELETE | `/frappe/connectors/:id` | Remove |
| POST | `/frappe/connectors/:id/test` | Testa conexão |
| POST | `/frappe/connectors/:id/sync` | Sincroniza dados |
| GET | `/frappe/connectors/:id/logs` | Logs de sync |
| GET | `/frappe/connectors/:id/mappings` | Mapeamentos |
| POST | `/frappe/connectors/:id/mappings` | Cria mapeamento |

### Estatísticas

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/stats` | KPIs gerais |
| GET | `/stats/sales` | Estatísticas de vendas |

**Total: 90+ endpoints**

---

## 10. Arquivos-Chave

| Arquivo | Função | Linhas |
|---------|--------|--------|
| `client/src/pages/Crm.tsx` | Interface principal (12 tabs) | 2.700 |
| `client/src/pages/XosCrm.tsx` | CRM Kanban/Pipeline | 752 |
| `client/src/pages/WhatsApp.tsx` | Interface WhatsApp | — |
| `server/crm/routes.ts` | API REST (90+ endpoints) | 1.592 |
| `server/crm/storage.ts` | CrmStorage class (Drizzle ORM) | 708 |
| `server/crm/communication.ts` | CommunicationService | 289 |
| `server/crm/commission-engine.ts` | CommissionEngine | 418 |
| `server/crm/whatsapp-bridge.ts` | WhatsAppBridge | 126 |
| `server/crm/frappe-service.ts` | Integração ERPNext | — |
| `server/crm/google-calendar.ts` | Google Calendar OAuth | — |
| `server/whatsapp/service.ts` | WhatsApp (Baileys) | — |
| `server/communication/engine.ts` | Motor Comunicação (:8006) | — |
| `shared/schema.ts` | 53 tabelas CRM/XOS/Comm | — |

---

## 11. Resumo Visual

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ARCÁDIA CRM STACK                             │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  FRONTEND                                                    │    │
│  │  Crm.tsx (12 tabs) + XosCrm.tsx (Kanban) + WhatsApp.tsx     │    │
│  └────────────────────────────┬────────────────────────────────┘    │
│                               │                                     │
│  ┌────────────────────────────▼────────────────────────────────┐    │
│  │  API: /api/crm/* — 90+ endpoints                           │    │
│  │  Router → CrmStorage → PostgreSQL                           │    │
│  └───┬─────────┬─────────┬──────────┬──────────┬──────────────┘    │
│      │         │         │          │          │                    │
│  ┌───▼───┐ ┌───▼───┐ ┌───▼────┐ ┌───▼───┐ ┌───▼────────┐         │
│  │Comm   │ │Comissão│ │WhatsApp│ │Frappe │ │Google Cal  │         │
│  │Service│ │Engine  │ │Bridge  │ │Service│ │OAuth       │         │
│  └───┬───┘ └───────┘ └───┬────┘ └───────┘ └────────────┘         │
│      │                    │                                        │
│      │              ┌─────▼──────┐                                 │
│      │              │  Baileys   │                                 │
│      │              │  WhatsApp  │                                 │
│      │              │  Multi-Sess│                                 │
│      │              └─────┬──────┘                                 │
│      │                    │                                        │
│  ┌───▼────────────────────▼──────────────────────────────────┐    │
│  │  Motor de Comunicação (:8006)                              │    │
│  │  Unifica: CRM + XOS + WhatsApp → comm_* tables            │    │
│  │  Alimenta: Knowledge Graph + Manus IA                      │    │
│  └───────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │  PostgreSQL: 53 tabelas (30 crm_* + 15 xos_* + 8 comm_*) │   │
│  └───────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```
