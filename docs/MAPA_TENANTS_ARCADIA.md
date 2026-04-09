# Arcádia Tenants — Mapa Completo da Gestão Multi-Tenant

> Mapa da arquitetura multi-tenant da Arcádia Suite: hierarquia
> Master/Parceiro/Cliente, sistema de planos, ativação de módulos,
> empresas (Matriz/Filiais), comissões de parceiros, controle de acesso,
> e middleware de isolamento.
> Atualizado em: Março 2026

---

## 1. Visão Geral

A Arcádia Suite opera em modelo **multi-tenant hierárquico** com três níveis. Cada tenant possui um plano que define quais módulos da plataforma estão habilitados, e pode conter múltiplas empresas (CNPJ) para operações fiscais.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      HIERARQUIA DE TENANTS                           │
│                                                                      │
│                    ┌──────────────┐                                  │
│                    │   MASTER     │  ← Operador da plataforma        │
│                    │              │  ← Vê tudo, controla tudo        │
│                    │  tenantType: │  ← Pode criar parceiros          │
│                    │  "master"    │  ← Pode excluir tenants          │
│                    └──────┬───────┘                                  │
│                           │                                          │
│              ┌────────────┼────────────┐                            │
│              ▼            ▼            ▼                            │
│     ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│     │  PARCEIRO A  │ │  PARCEIRO B  │ │  PARCEIRO C  │             │
│     │              │ │              │ │              │             │
│     │ tenantType:  │ │ Consultorias │ │ Integradores │             │
│     │ "partner"    │ │ Revendas     │ │ Franquias    │             │
│     │              │ │              │ │              │             │
│     │ partnerCode: │ │ comissão: %  │ │ plano:       │             │
│     │ "PARC-001"   │ │ sobre clientes│ │partner_pro  │             │
│     └──────┬───────┘ └──────┬───────┘ └──────┬───────┘             │
│            │                │                │                      │
│       ┌────┴────┐      ┌───┴───┐        ┌───┴───┐                 │
│       ▼         ▼      ▼       ▼        ▼       ▼                 │
│   ┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐   │
│   │Cliente1││Cliente2││Cliente3││Cliente4││Cliente5││Cliente6│   │
│   │        ││        ││        ││        ││        ││        │   │
│   │tenant  ││tenant  ││tenant  ││tenant  ││tenant  ││tenant  │   │
│   │Type:   ││Type:   ││Type:   ││Type:   ││Type:   ││Type:   │   │
│   │"client"││"client"││"client"││"client"││"client"││"client"│   │
│   │        ││        ││        ││        ││        ││        │   │
│   │parent: ││parent: ││parent: ││parent: ││parent: ││parent: │   │
│   │Parc.A  ││Parc.A  ││Parc.B  ││Parc.B  ││Parc.C  ││Parc.C  │   │
│   │        ││        ││        ││        ││        ││        │   │
│   │Plano:  ││Plano:  ││Plano:  ││Plano:  ││Plano:  ││Plano:  │   │
│   │starter ││pro     ││free    ││enterpr.││starter ││pro     │   │
│   └────────┘└────────┘└────────┘└────────┘└────────┘└────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Visibilidade por tipo:

| Tipo | Vê | Cria | Exclui |
|------|-----|------|--------|
| **Master** | Todos os tenants | Parceiros e Clientes | Qualquer (exceto master) |
| **Partner** | Seu tenant + seus clientes | Apenas clientes vinculados | Nenhum |
| **Client** | Apenas seu próprio tenant | Nenhum | Nenhum |

---

## 2. Banco de Dados — Tabelas de Tenant

### 2.1 — tenants (Tabela Principal)

```
┌──────────────────────────────────────────────────────────────────┐
│  tenants                                                          │
│  Tabela: "tenants" — shared/schema.ts:849                        │
│                                                                   │
│  ┌─────────── Identificação ──────────────────┐                  │
│  │ id              serial PK                   │                  │
│  │ name            text NOT NULL                │                  │
│  │ slug            text UNIQUE                  │                  │
│  │ email           text                         │                  │
│  │ phone           text                         │                  │
│  │ logoUrl         text                         │                  │
│  └─────────────────────────────────────────────┘                  │
│                                                                   │
│  ┌─────────── Hierarquia ─────────────────────┐                  │
│  │ tenantType      "master" | "partner" |      │                  │
│  │                 "client"                     │                  │
│  │ parentTenantId  integer (self-ref FK)        │                  │
│  │ partnerCode     text (código único parceiro) │                  │
│  │ commissionRate  numeric(5,2) (% comissão)    │                  │
│  └─────────────────────────────────────────────┘                  │
│                                                                   │
│  ┌─────────── Plano e Limites ────────────────┐                  │
│  │ plan            "free" | "starter" | "pro"  │                  │
│  │                 | "enterprise" |            │                  │
│  │                 "partner_starter" |          │                  │
│  │                 "partner_pro"                │                  │
│  │ status          "active" | "trial" |        │                  │
│  │                 "suspended" | "cancelled"   │                  │
│  │ maxUsers        integer (default 5)          │                  │
│  │ maxStorageMb    integer (default 1000)        │                  │
│  │ features        JSONB → TenantFeatures       │  ← Módulos      │
│  └─────────────────────────────────────────────┘                  │
│                                                                   │
│  ┌─────────── Billing ────────────────────────┐                  │
│  │ billingEmail    text                         │                  │
│  │ trialEndsAt     timestamp                    │                  │
│  └─────────────────────────────────────────────┘                  │
│                                                                   │
│  ┌─────────── Dados Empresariais ─────────────┐                  │
│  │ cnpj            text                         │                  │
│  │ tradeName       text                         │                  │
│  │ address         text                         │                  │
│  │ city, state     text                         │                  │
│  │ segment         text                         │                  │
│  │ notes, source   text                         │                  │
│  │ commercialContact / commercialPhone          │                  │
│  └─────────────────────────────────────────────┘                  │
│                                                                   │
│  ┌─────────── Metadata ───────────────────────┐                  │
│  │ settings        text (JSON config)           │                  │
│  │ createdAt       timestamp                    │                  │
│  │ updatedAt       timestamp                    │                  │
│  └─────────────────────────────────────────────┘                  │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 — TenantFeatures (JSONB — Sistema de Módulos)

O campo `features` na tabela `tenants` é um JSONB que controla **quais módulos da Arcádia estão habilitados** para cada tenant. O tipo é definido em `shared/schema.ts:821` e espelhado no frontend em `client/src/hooks/use-tenant-features.ts:3`.

```
┌──────────────────────────────────────────────────────────────────┐
│  TenantFeatures (JSONB)                                           │
│                                                                   │
│  ┌─────────── Módulos Booleanos ──────────────┐                  │
│  │                                             │                  │
│  │  ide           → IDE integrada              │                  │
│  │  whatsapp      → WhatsApp multi-sessão      │                  │
│  │  crm           → CRM completo               │                  │
│  │  erp           → SOE/ERP                     │                  │
│  │  bi            → Business Intelligence       │                  │
│  │  manus         → IA Manus (GPT-4o)          │                  │
│  │  centralApis   → APIs centrais              │                  │
│  │  centralApisManage → Gerenciar APIs          │                  │
│  │  comunidades   → Chat interno               │                  │
│  │  biblioteca    → Biblioteca de conhecimento  │                  │
│  │  bibliotecaPublish → Publicar na biblioteca  │                  │
│  │  suporteN3     → Suporte nível 3            │                  │
│  │  retail        → Módulo Varejo              │                  │
│  │  plus          → ERP Plus (Laravel)          │                  │
│  │  fisco         → Motor Fiscal               │                  │
│  │  cockpit       → Cockpit executivo          │                  │
│  │  compass       → Process Compass            │                  │
│  │  production    → Módulo Produção            │                  │
│  │  support       → Módulo Suporte             │                  │
│  │  xosCrm        → XOS CRM (Kanban)           │                  │
│  │                                             │                  │
│  └─────────────────────────────────────────────┘                  │
│                                                                   │
│  ┌─────────── Configurações Numéricas ────────┐                  │
│  │                                             │                  │
│  │  whatsappSessions  → Nº sessões WA (0-N)   │                  │
│  │  maxChannels       → Nº canais permitidos   │                  │
│  │                                             │                  │
│  └─────────────────────────────────────────────┘                  │
│                                                                   │
│  ┌─────────── Configurações de Texto ─────────┐                  │
│  │                                             │                  │
│  │  ideMode       → "none" | "no-code" |       │                  │
│  │                  "low-code" | "pro-code"    │                  │
│  │  manusTools[]  → Lista de tools habilitadas │                  │
│  │                                             │                  │
│  └─────────────────────────────────────────────┘                  │
└──────────────────────────────────────────────────────────────────┘
```

### 2.3 — tenant_empresas (Matriz/Filiais)

Cada tenant pode ter **múltiplas empresas** (CNPJs) cadastradas — essencial para operações fiscais (NF-e/NFC-e) por filial.

```
┌──────────────────────────────────────────────────────────────────┐
│  tenant_empresas                                                  │
│  Tabela: "tenant_empresas" — shared/schema.ts:889                │
│                                                                   │
│  ┌─────────── Identificação ──────────────────┐                  │
│  │ id              serial PK                   │                  │
│  │ tenantId        FK → tenants.id (CASCADE)   │                  │
│  │ razaoSocial     text NOT NULL                │                  │
│  │ nomeFantasia    text                         │                  │
│  │ cnpj            text NOT NULL                │                  │
│  │ ie              text (inscrição estadual)    │                  │
│  │ im              text (inscrição municipal)   │                  │
│  │ email, phone    text                         │                  │
│  │ tipo            "matriz" | "filial"          │                  │
│  │ status          "active" | "inactive"        │                  │
│  └─────────────────────────────────────────────┘                  │
│                                                                   │
│  ┌─────────── Endereço ───────────────────────┐                  │
│  │ cep, logradouro, numero, complemento,      │                  │
│  │ bairro, cidade, uf, codigoIbge             │                  │
│  └─────────────────────────────────────────────┘                  │
│                                                                   │
│  ┌─────────── Fiscal ─────────────────────────┐                  │
│  │ regimeTributario  "simples" | "presumido"   │                  │
│  │                   | "real"                  │                  │
│  │ certificadoDigitalId  FK certificado        │                  │
│  │ ambienteFiscal  "producao" | "homologacao"  │                  │
│  │ serieNfe        integer (default 1)          │                  │
│  │ serieNfce       integer (default 1)          │                  │
│  │ plusEmpresaId   integer (link ERP Plus)      │                  │
│  └─────────────────────────────────────────────┘                  │
│                                                                   │
│  ┌─────────── Metadata ───────────────────────┐                  │
│  │ createdAt, updatedAt  timestamp              │                  │
│  └─────────────────────────────────────────────┘                  │
└──────────────────────────────────────────────────────────────────┘
```

**Uso típico:**

```
Tenant "Empresa ABC" (id: 5)
├── Empresa Matriz: "ABC Comércio LTDA" (CNPJ: 12.345.678/0001-00)
│   regime: simples, ambiente: producao, série NF-e: 1
├── Filial SP: "ABC Comércio SP" (CNPJ: 12.345.678/0002-81)
│   regime: simples, ambiente: producao, série NF-e: 2
└── Filial RJ: "ABC Comércio RJ" (CNPJ: 12.345.678/0003-62)
    regime: simples, ambiente: homologacao, série NF-e: 1
```

### 2.4 — tenant_users (Membership)

```
┌──────────────────────────────────────────────────────────────────┐
│  tenant_users                                                     │
│  Tabela: "tenant_users" — shared/schema.ts:923                   │
│                                                                   │
│  id           serial PK                                           │
│  tenantId     FK → tenants.id (CASCADE)                           │
│  userId       FK → users.id (CASCADE)                             │
│  role         "owner" | "admin" | "member"                        │
│  isOwner      "true" | "false"                                    │
│  createdAt    timestamp                                           │
│                                                                   │
│  → Link N:N entre users e tenants                                 │
│  → Um usuário pode pertencer a múltiplos tenants                  │
│  → Cada tenant tem um owner + admins + members                    │
└──────────────────────────────────────────────────────────────────┘
```

### 2.5 — tenant_plans (Planos Disponíveis)

```
┌──────────────────────────────────────────────────────────────────┐
│  tenant_plans                                                     │
│  Tabela: "tenant_plans" — shared/schema.ts:933                   │
│                                                                   │
│  id            serial PK                                          │
│  code          text UNIQUE ("free", "starter", "pro",             │
│                "enterprise", "partner_starter", "partner_pro")    │
│  name          text NOT NULL                                      │
│  description   text                                               │
│  tenantType    "master" | "partner" | "client"                    │
│  maxUsers      integer (default 5)                                │
│  maxStorageMb  integer (default 1000)                             │
│  features      JSONB → TenantFeatures                             │
│  monthlyPrice  integer (centavos)                                 │
│  yearlyPrice   integer (centavos)                                 │
│  trialDays     integer (default 14)                               │
│  isActive      "true" | "false"                                   │
│  sortOrder     integer                                            │
│  createdAt     timestamp                                          │
└──────────────────────────────────────────────────────────────────┘
```

### 2.6 — partner_clients (Relacionamento Parceiro↔Cliente)

```
┌──────────────────────────────────────────────────────────────────┐
│  partner_clients                                                  │
│  Tabela: "partner_clients" — shared/schema.ts:951                │
│                                                                   │
│  id              serial PK                                        │
│  partnerId       FK → tenants.id (CASCADE)                        │
│  clientId        FK → tenants.id (CASCADE)                        │
│  commissionRate  numeric(5,2) — Override do rate do parceiro      │
│  status          "active" | "suspended" | "ended"                 │
│  notes           text                                             │
│  startedAt       timestamp                                        │
│  endedAt         timestamp                                        │
└──────────────────────────────────────────────────────────────────┘
```

### 2.7 — partner_commissions (Comissões dos Parceiros)

```
┌──────────────────────────────────────────────────────────────────┐
│  partner_commissions                                              │
│  Tabela: "partner_commissions" — shared/schema.ts:963            │
│                                                                   │
│  id               serial PK                                       │
│  partnerId        FK → tenants.id (CASCADE)                       │
│  clientId         FK → tenants.id (CASCADE)                       │
│  referenceMonth   text ("2026-01", "2026-02", ...)                │
│  clientPlanCode   text (código do plano do cliente)                │
│  clientPlanValue  integer (valor do plano em centavos)             │
│  commissionRate   numeric(5,2) NOT NULL                           │
│  commissionValue  integer NOT NULL (valor em centavos)             │
│  status           "pending" | "approved" | "paid" | "cancelled"   │
│  approvedAt       timestamp                                       │
│  paidAt           timestamp                                       │
│  paymentReference text                                            │
│  createdAt        timestamp                                       │
│                                                                   │
│  Fluxo: pending → approved → paid                                 │
│                                                                   │
│  Exemplo:                                                         │
│  Parceiro A tem Cliente X no plano "pro" (R$ 299/mês)            │
│  commissionRate: 20%                                              │
│  commissionValue: 5980 centavos (R$ 59,80)                        │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Planos Pré-definidos (Seed)

A rota `POST /api/admin/plans/seed` cria os 6 planos padrão:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PLANOS PARA CLIENTES                          │
├────────────┬──────────┬──────────┬──────────────────────────────────┤
│ Plano      │ Preço/mês│ Usuários │ Módulos                          │
├────────────┼──────────┼──────────┼──────────────────────────────────┤
│ Gratuito   │ R$ 0     │ 2        │ erp, crm                         │
│ (free)     │          │          │                                  │
├────────────┼──────────┼──────────┼──────────────────────────────────┤
│ Starter    │ R$ 99    │ 5        │ erp, crm, bi, fisco,             │
│            │          │          │ whatsapp, compass                │
├────────────┼──────────┼──────────┼──────────────────────────────────┤
│ Pro        │ R$ 299   │ 15       │ erp, crm, bi, fisco, retail,     │
│            │          │          │ plus, whatsapp, manus, cockpit,  │
│            │          │          │ compass, support, biblioteca     │
├────────────┼──────────┼──────────┼──────────────────────────────────┤
│ Enterprise │ R$ 999   │ 100      │ TODOS os módulos                 │
│            │          │ 50GB     │ (erp, crm, bi, fisco, retail,    │
│            │          │          │ plus, whatsapp, manus, ide,      │
│            │          │          │ cockpit, compass, production,    │
│            │          │          │ support, xosCrm, centralApis,    │
│            │          │          │ comunidades, biblioteca)         │
└────────────┴──────────┴──────────┴──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       PLANOS PARA PARCEIROS                          │
├──────────────────┬──────────┬──────────┬────────────────────────────┤
│ Plano            │ Preço/mês│ Usuários │ Módulos                    │
├──────────────────┼──────────┼──────────┼────────────────────────────┤
│ Parceiro Starter │ R$ 199   │ 10       │ erp, crm, bi, fisco,       │
│                  │          │          │ retail, whatsapp, compass,  │
│                  │          │          │ support                    │
├──────────────────┼──────────┼──────────┼────────────────────────────┤
│ Parceiro Pro     │ R$ 499   │ 50       │ TODOS os módulos           │
│                  │          │ 25GB     │ (igual Enterprise)         │
└──────────────────┴──────────┴──────────┴────────────────────────────┘
```

---

## 4. Sistema de Papéis (Roles)

A Arcádia opera com **dois níveis de papéis** que se complementam:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SISTEMA DUPLO DE ROLES                            │
│                                                                      │
│  ┌─────────── Papel do Sistema (users.role) ──────────────────┐    │
│  │                                                             │    │
│  │  "master"  → Superadmin, acesso total, bypass de tenant    │    │
│  │  "admin"   → Administrador, acessa /api/admin/*            │    │
│  │  "user"    → Usuário padrão, sem acesso admin              │    │
│  │                                                             │    │
│  │  Verificado no middleware global de admin:                  │    │
│  │  if (role !== "admin" && role !== "master") → 403           │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────── Papel no Tenant (tenant_users.role) ────────────┐    │
│  │                                                             │    │
│  │  "owner"   → Dono do tenant, criador, full control         │    │
│  │  "admin"   → Administrador do tenant                       │    │
│  │  "member"  → Membro comum, acesso operacional              │    │
│  │                                                             │    │
│  │  Usado para scoping de dados e permissões intra-tenant     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Combinação no login (getEnrichedUser):                              │
│  user.role + user.tenantId + user.tenantType + user.tenantRole       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Controle de Acesso — Helpers

O backend implementa dois helpers essenciais em `server/admin/routes.ts`:

```
┌─────────────────────────────────────────────────────────────────────┐
│  getAllowedTenantIds(user)                                            │
│                                                                      │
│  Retorna os IDs de tenants que o usuário pode acessar:              │
│                                                                      │
│  • master      → null (acesso total, sem filtro)                    │
│  • partner     → [seu tenantId, ...clientIds vinculados]            │
│  • client      → [apenas seu tenantId]                              │
│                                                                      │
│  Usado em: GET /tenants, GET /partner-clients, GET /commissions,    │
│  GET /empresas, GET /tenants/hierarchy                               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  canAccessTenant(user, tenantId)                                     │
│                                                                      │
│  Verifica se o usuário pode operar sobre um tenant específico:      │
│                                                                      │
│  • master → true (sempre)                                            │
│  • partner → true se tenantId ∈ getAllowedTenantIds()               │
│  • client → true apenas se tenantId === user.tenantId               │
│                                                                      │
│  Usado em: PATCH /tenants/:id, DELETE /empresas/:id,                │
│  POST /empresas, etc.                                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Middleware de Módulos (requireModule)

O middleware `requireModule` em `server/retail/routes.ts:25` bloqueia endpoints quando um módulo não está ativo para o tenant:

```
┌─────────────────────────────────────────────────────────────────────┐
│  requireModule(moduleKey: keyof TenantFeatures)                      │
│                                                                      │
│  Fluxo:                                                              │
│  1. Identifica tenantId do usuário logado                           │
│  2. Busca tenant no banco                                            │
│  3. Verifica features[moduleKey] === true                            │
│  4. Se false → 403 com mensagem:                                    │
│     {                                                                │
│       error: "Módulo 'X' não está ativo para este tenant",          │
│       moduleKey: "plus",                                             │
│       action: "Ative o módulo em Admin → Módulos"                   │
│     }                                                                │
│                                                                      │
│  Exemplo de uso:                                                     │
│  router.post("/plus/sync/customers",                                │
│    requireModule("plus"),     ← Bloqueia se Plus não está ativo     │
│    async (req, res) => { ... }                                      │
│  );                                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Hook Frontend (useTenantFeatures)

O hook `useTenantFeatures()` em `client/src/hooks/use-tenant-features.ts` fornece acesso às features do tenant no frontend:

```
┌─────────────────────────────────────────────────────────────────────┐
│  useTenantFeatures()                                                 │
│                                                                      │
│  Fonte: GET /api/soe/tenant/modules                                 │
│  Cache: 60 segundos (staleTime: 60000)                              │
│                                                                      │
│  Retorna:                                                            │
│  {                                                                   │
│    features: TenantFeatures,  ← Objeto completo de features         │
│    isLoading: boolean,                                               │
│    plan: string,              ← Código do plano atual                │
│    isEnabled: (key) => bool,  ← Verificação rápida                  │
│  }                                                                   │
│                                                                      │
│  Defaults (quando não logado / sem tenant):                         │
│  ide: true, crm: true, erp: true, manus: true, compass: true       │
│  Todos os demais: false                                              │
│                                                                      │
│  Uso no componente:                                                  │
│  const { isEnabled } = useTenantFeatures();                          │
│  if (isEnabled("bi")) { /* mostra menu BI */ }                      │
│  if (isEnabled("retail")) { /* mostra módulo varejo */ }            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. Interface de Administração

### 8.1 — Admin.tsx (Página Principal)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Admin.tsx — client/src/pages/Admin.tsx (2.635 linhas)               │
│  Rota: /admin                                                        │
│                                                                      │
│  6 Abas:                                                             │
│  ┌─────────────┬──────────┬────────────┬───────────┬──────────────┐ │
│  │ Conexões    │ Tarefas  │ Knowledge  │ Bibliotecas│ Módulos     │ │
│  │             │          │            │            │             │ │
│  │ WhatsApp    │ Dev      │ Knowledge  │ Conteúdo   │ Ativação    │ │
│  │ ERPNext     │ Center   │ Graph      │ Docs       │ por tenant  │ │
│  │ APIs        │ Pipeline │ Q&A        │ Templates  │ Toggle on/  │ │
│  │             │          │            │            │ off módulos │ │
│  └─────────────┴──────────┴────────────┴───────────┴──────────────┘ │
│  ┌─────────────┐                                                     │
│  │Casa de      │                                                     │
│  │Máquinas     │                                                     │
│  │             │                                                     │
│  │ Status dos  │                                                     │
│  │ motores     │                                                     │
│  │ (:8002-8006)│                                                     │
│  └─────────────┘                                                     │
│                                                                      │
│  Aba "Módulos" renderiza: <MultiTenantSection />                    │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.2 — MultiTenantSection (Gestão Completa)

```
┌─────────────────────────────────────────────────────────────────────┐
│  MultiTenantSection.tsx (1.486 linhas)                               │
│  client/src/components/MultiTenantSection.tsx                        │
│                                                                      │
│  4 Abas internas:                                                    │
│                                                                      │
│  ┌─ Tenants ──────────────────────────────────────────────────┐     │
│  │                                                             │     │
│  │  Lista de tenants com:                                      │     │
│  │  • Nome, tipo (Master/Parceiro/Cliente)                    │     │
│  │  • Plano atual e status                                     │     │
│  │  • Nº de filhos (childCount)                                │     │
│  │  • Tenant pai (parentTenant)                                │     │
│  │  • Ações: Editar, Ativar/Desativar módulos                 │     │
│  │                                                             │     │
│  │  Formulário de criação:                                     │     │
│  │  • Nome, email, phone                                       │     │
│  │  • Tipo (master/partner/client)                             │     │
│  │  • Plano (seleciona do tenant_plans)                        │     │
│  │  • Tenant pai (para hierarquia)                             │     │
│  │  • Features auto-preenchidas pelo plano selecionado        │     │
│  │  • Toggle individual de cada módulo                        │     │
│  │                                                             │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  ┌─ Planos ───────────────────────────────────────────────────┐     │
│  │                                                             │     │
│  │  CRUD de planos com:                                        │     │
│  │  • Código, nome, descrição                                  │     │
│  │  • Tipo de tenant (client/partner)                          │     │
│  │  • Preço mensal e anual (centavos)                          │     │
│  │  • Max usuários e storage                                   │     │
│  │  • Features (toggle de cada módulo)                         │     │
│  │  • Botão "Seed" para criar planos padrão                   │     │
│  │  • Botão "Propagar" para aplicar features do plano          │     │
│  │    a todos os tenants que usam esse plano                   │     │
│  │                                                             │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  ┌─ Comissões ────────────────────────────────────────────────┐     │
│  │                                                             │     │
│  │  Lista de comissões de parceiros:                           │     │
│  │  • Parceiro, Cliente, Mês referência                        │     │
│  │  • Valor do plano, taxa de comissão, valor da comissão     │     │
│  │  • Status (pending → approved → paid)                      │     │
│  │  • Ações: Aprovar, Marcar como paga                        │     │
│  │                                                             │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  ┌─ Empresas ─────────────────────────────────────────────────┐     │
│  │                                                             │     │
│  │  EmpresasSubSection:                                        │     │
│  │  • Lista de empresas (Matriz/Filiais) por tenant            │     │
│  │  • CNPJ, Razão Social, Nome Fantasia                        │     │
│  │  • IE, IM, Regime Tributário                                │     │
│  │  • Endereço completo (CEP, logradouro, cidade, UF)         │     │
│  │  • Config Fiscal (ambiente, série NF-e, série NFC-e)       │     │
│  │  • Link com ERP Plus (plusEmpresaId)                        │     │
│  │  • Ações: Criar, Editar, Excluir                           │     │
│  │                                                             │     │
│  └─────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 9. API REST Completa (/api/admin/*)

### Tenants

| Método | Endpoint | Função | Acesso |
|--------|----------|--------|--------|
| GET | `/tenants` | Lista tenants (filtrado por acesso) | master/partner/client |
| POST | `/tenants` | Cria tenant (resolve features do plano) | master/admin |
| PATCH | `/tenants/:id` | Atualiza tenant (canAccessTenant) | master/partner |
| DELETE | `/tenants/:id` | Exclui tenant (proteção master) | somente master |
| GET | `/tenants/hierarchy` | Árvore hierárquica de tenants | master/partner |
| GET | `/tenants/stats` | Estatísticas (total, por tipo, por status) | master/admin |

### Planos

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/plans` | Lista todos os planos |
| POST | `/plans` | Cria novo plano |
| PATCH | `/plans/:id` | Atualiza plano |
| DELETE | `/plans/:id` | Exclui plano |
| POST | `/plans/:id/propagate` | Propaga features do plano para todos os tenants que o usam |
| POST | `/plans/seed` | Cria 6 planos padrão |

### Parceiro-Cliente

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/partner-clients` | Lista relacionamentos parceiro↔cliente |
| POST | `/partner-clients` | Cria vínculo parceiro↔cliente |

### Comissões de Parceiros

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/commissions` | Lista comissões (filtro por partnerId, status) |
| PATCH | `/commissions/:id/approve` | Aprova comissão |
| PATCH | `/commissions/:id/pay` | Marca como paga |

### Empresas (Matriz/Filiais)

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/empresas` | Lista empresas (filtro por tenantId + acesso) |
| GET | `/empresas/:id` | Detalhe da empresa |
| POST | `/empresas` | Cria empresa (verifica canAccessTenant) |
| PATCH | `/empresas/:id` | Atualiza empresa |
| DELETE | `/empresas/:id` | Exclui empresa |

### Outros Admin

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/profiles` | Lista perfis de usuários |
| POST | `/profiles` | Cria perfil |
| PATCH | `/profiles/:id` | Atualiza perfil |
| DELETE | `/profiles/:id` | Exclui perfil |
| GET | `/users` | Lista usuários (com tenant info) |
| PATCH | `/users/:id` | Atualiza usuário |
| PATCH | `/users/:id/status` | Altera status do usuário |
| PATCH | `/partners/:id/status` | Altera status de parceiro |
| PATCH | `/clients/:id/status` | Altera status de cliente |
| GET | `/stats` | Estatísticas gerais (tenants, users, leads) |
| GET | `/libraries` | Lista bibliotecas de conteúdo |

**Total: 33 endpoints de administração**

---

## 10. Fluxo Completo — Onboarding de Tenant

```
┌──────────┐    ┌────────────┐    ┌──────────────┐    ┌──────────────┐
│  1. CRIAR │───▶│ 2. PLANO   │───▶│ 3. FEATURES  │───▶│ 4. EMPRESAS  │
│  TENANT   │    │            │    │              │    │              │
│           │    │ Seleciona  │    │ Auto-resolve │    │ Cadastra     │
│ POST      │    │ plano      │    │ do plano ou  │    │ Matriz       │
│ /admin/   │    │ (free,     │    │ toggle       │    │ + Filiais    │
│ tenants   │    │ starter,   │    │ individual   │    │              │
│           │    │ pro, etc)  │    │ de módulos   │    │ CNPJ, IE,    │
│ name,     │    │            │    │              │    │ endereço,    │
│ email,    │    │ maxUsers   │    │ ide: true    │    │ regime       │
│ type      │    │ maxStorage │    │ crm: true    │    │ tributário,  │
│           │    │ preço      │    │ bi: false    │    │ certificado  │
│           │    │            │    │ ...          │    │ digital      │
└──────────┘    └────────────┘    └──────────────┘    └──────────────┘
                                                              │
                                                              ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐
│ 5. VINCULAR  │    │ 6. COMISSÕES │    │ 7. USUÁRIOS              │
│ PARCEIRO     │    │              │    │                          │
│ (se partner) │    │ Automáticas  │    │ Convida users            │
│              │    │ mensais      │    │ tenant_users             │
│ POST /admin/ │    │ baseadas no  │    │ roles: owner/admin/      │
│ partner-     │    │ plano do     │    │ member                   │
│ clients      │    │ cliente      │    │                          │
│              │    │              │    │ Scoping automático       │
│ partnerId    │    │ pending →    │    │ de todos os dados        │
│ clientId     │    │ approved →   │    │ por tenantId             │
│ commission%  │    │ paid         │    │                          │
└──────────────┘    └──────────────┘    └──────────────────────────┘
```

---

## 11. Propagação de Plano

Quando um plano é atualizado, a feature de **propagação** atualiza todos os tenants que usam esse plano:

```
┌─────────────────────────────────────────────────────────────────────┐
│  POST /api/admin/plans/:id/propagate                                 │
│                                                                      │
│  1. Busca o plano por ID                                            │
│  2. Pega features, maxUsers, maxStorageMb do plano                  │
│  3. Atualiza TODOS os tenants onde plan === plan.code:              │
│     UPDATE tenants SET                                               │
│       features = plan.features,                                      │
│       maxUsers = plan.maxUsers,                                      │
│       maxStorageMb = plan.maxStorageMb                               │
│     WHERE plan = 'pro'                                               │
│  4. Retorna: { propagated: 15, planCode: "pro" }                    │
│                                                                      │
│  Exemplo:                                                            │
│  Plano "pro" ganha módulo "production" →                            │
│  Propagar → 15 tenants "pro" recebem production: true               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 12. Isolamento de Dados

Toda query de dados respeita o escopo do tenant:

```
┌─────────────────────────────────────────────────────────────────────┐
│  ISOLAMENTO POR tenantId                                             │
│                                                                      │
│  Padrão em todas as queries:                                         │
│                                                                      │
│  const tenantId = (req.user as any).tenantId;                       │
│  const data = await db.select()                                      │
│    .from(tabela)                                                     │
│    .where(eq(tabela.tenantId, tenantId));                            │
│                                                                      │
│  Tabelas com tenantId:                                               │
│  • tenants (hierarquia)        • crm_channels                       │
│  • tenant_empresas             • crm_threads                        │
│  • crm_leads                   • crm_events                         │
│  • crm_clients                 • crm_campaigns                      │
│  • crm_opportunities           • crm_products                       │
│  • crm_partners                • crm_contracts                      │
│  • crm_pipeline_stages         • crm_commission_rules               │
│  • crm_proposals               • crm_quick_messages                 │
│  • retail_activity_feed        • valuation_*                         │
│                                                                      │
│  Resultado: Dados do Tenant A NUNCA são vistos pelo Tenant B        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 13. Arquivos-Chave

| Arquivo | Função | Linhas |
|---------|--------|--------|
| `shared/schema.ts` (L821-977) | TenantFeatures type + 6 tabelas tenant | ~160 |
| `server/admin/routes.ts` | API admin (33 endpoints) | 876 |
| `client/src/pages/Admin.tsx` | Página admin (6 abas) | 2.635 |
| `client/src/components/MultiTenantSection.tsx` | Gestão multi-tenant (4 sub-abas) | 1.486 |
| `client/src/hooks/use-tenant-features.ts` | Hook de features no frontend | 59 |
| `server/retail/routes.ts` (L25) | Middleware requireModule | ~25 |
| `server/storage.ts` (getEnrichedUser) | Enriquece user com tenant info | — |

---

## 14. Resumo Visual

```
┌─────────────────────────────────────────────────────────────────────┐
│                  ARCÁDIA MULTI-TENANT STACK                          │
│                                                                      │
│  ┌───── Autenticação ──────────────────────────────────────────┐   │
│  │  Login → getEnrichedUser → user + tenantId + tenantType     │   │
│  │                            + tenantRole + features           │   │
│  └─────────────────────────────────────────┬───────────────────┘   │
│                                             │                       │
│  ┌─────────────────────────────────────────▼───────────────────┐   │
│  │  Middleware                                                  │   │
│  │  ┌──────────┐  ┌─────────────┐  ┌────────────────────┐     │   │
│  │  │requireAuth│  │requireModule │  │getAllowedTenantIds │     │   │
│  │  │role check │  │feature check │  │canAccessTenant     │     │   │
│  │  └──────────┘  └─────────────┘  └────────────────────┘     │   │
│  └─────────────────────────────────────────┬───────────────────┘   │
│                                             │                       │
│  ┌─────────────────────────────────────────▼───────────────────┐   │
│  │  API /api/admin/*                                            │   │
│  │  33 endpoints: Tenants, Plans, Empresas, Comissões          │   │
│  └─────────────────────────────────────────┬───────────────────┘   │
│                                             │                       │
│  ┌─────────────────────────────────────────▼───────────────────┐   │
│  │  PostgreSQL                                                  │   │
│  │  6 tabelas: tenants, tenant_users, tenant_plans,            │   │
│  │  tenant_empresas, partner_clients, partner_commissions      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌───── Frontend ──────────────────────────────────────────────┐   │
│  │  Admin.tsx (6 abas) → MultiTenantSection (4 sub-abas)       │   │
│  │  useTenantFeatures() hook → GET /api/soe/tenant/modules     │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```
