# Arcádia SOE — Sistema Operacional Empresarial
## Mapa Completo para Deploy em Servidor Dedicado

> Mapa da rota `/soe`: todos os arquivos do módulo, domínios de negócio,
> padrão de motor (adapter), tabelas PostgreSQL, APIs REST e dependências
> externas. Atualizado em: Março 2026.

---

## 1. O que é o SOE

O **Arcádia SOE (Sistema Operacional Empresarial)** é o **kernel central** da Arcádia Suite — o sistema que concentra todos os domínios canônicos de negócio. Enquanto apps como Varejo, Engenharia e Food Service adicionam experiências verticais, o SOE é a camada horizontal que todos compartilham.

**Princípio central:** O SOE **pensa e governa**; os motores (Plus, ERPNext) **executam e registram**.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ARCÁDIA SOE — VISÃO GERAL                       │
│                                                                      │
│  URL: /soe                                                           │
│  API: /api/soe/* (alias backward-compatible → /api/erp/*)           │
│                                                                      │
│  ┌──────── Domínios Canônicos ────────────────────────────────┐     │
│  │                                                             │     │
│  │  Pessoas  │ Produtos │ Vendas   │ Compras  │ Estoque       │     │
│  │  Fiscal   │ Financ.  │ CRM      │ Projetos │ Qualidade     │     │
│  │  Governa. │ RH       │                                     │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  ┌──────── Motores (Adapters) ────────────────────────────────┐     │
│  │                                                             │     │
│  │  motor = "plus"    → Arcádia Plus (Laravel :8080)         │     │
│  │  motor = "erpnext" → ERPNext/Frappe (externo)             │     │
│  │  motor = nativo    → PostgreSQL local (default fallback)   │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  ┌──────── Apps que estendem o SOE ───────────────────────────┐     │
│  │  Varejo (Retail)  │  Engenharia  │  Food Service           │     │
│  │  Assistência Tec  │  Educação    │  (outros segmentos)     │     │
│  └─────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Arquivos do Módulo SOE — Lista Completa para Export

### 2.1 — Frontend (React/TypeScript)

| Arquivo | Função | Linhas |
|---------|--------|--------|
| `client/src/pages/SOE.tsx` | **Página principal** do SOE — 9 abas, CRUD completo | 2.414 |
| `client/src/pages/ERP.tsx` | Legacy ERP — mantido para referência histórica | 2.197 |
| `client/src/contexts/SoeMotorContext.tsx` | **Context do Motor** — gerencia plus/erpnext via localStorage | 63 |
| `client/src/contexts/ErpProfileContext.tsx` | Alias legacy do SoeMotorContext (backward compat.) | 52 |

### 2.2 — Backend (Node.js/TypeScript)

| Arquivo | Função | Linhas |
|---------|--------|--------|
| `server/erp/routes.ts` | **Rotas SOE core** — /api/erp/* (= /api/soe/*) | 1.343 |
| `server/erp/index.ts` | Setup do módulo + alias /api/soe → /api/erp | 210 |
| `server/retail/routes.ts` | **Rotas do Varejo** — /api/retail/* | 5.218 |
| `server/retail/index.ts` | Setup do módulo retail | — |
| `server/retail/sync-service.ts` | Sincronização retail ↔ Plus | — |
| `server/retail/plus-sync.ts` | Ponte retail → Arcádia Plus | — |
| `server/plus/client.ts` | **Cliente HTTP** para Arcádia Plus (:8080) | 376 |
| `server/plus/routes.ts` | Rotas de integração Plus | — |
| `server/plus/launcher.ts` | Iniciador do serviço Plus | — |
| `server/plus/proxy.ts` | Proxy transparente → Plus (:8080) | — |
| `server/plus/sso.ts` | Single Sign-On entre SOE e Plus | — |
| `server/erpnext/routes.ts` | Rotas de integração ERPNext | — |
| `server/erpnext/index.ts` | Setup do módulo ERPNext | — |

### 2.3 — Schema PostgreSQL (Drizzle ORM)

| Arquivo | Tabelas relacionadas ao SOE |
|---------|----------------------------|
| `shared/schema.ts` (L348) | `erp_connections` |
| `shared/schema.ts` (L3303) | `erp_segments`, `erp_config` |
| `shared/schema.ts` (L3367–3517) | `customers`, `suppliers`, `products`, `sales_orders`, `sales_order_items`, `purchase_orders`, `purchase_order_items` |
| `shared/schema.ts` (L5082–5617) | Tabelas retail (ver seção 5) |
| `shared/schema.ts` (L6204) | `persons`, `person_roles` |
| `shared/schema.ts` (L4372) | `fin_payment_methods`, `fin_payment_plans` |

---

## 3. Arquitetura de Arquivos

```
workspace/
│
├── client/src/
│   ├── pages/
│   │   ├── SOE.tsx                  ← Página principal (/soe)
│   │   └── ERP.tsx                  ← Legacy (mantido)
│   │
│   └── contexts/
│       ├── SoeMotorContext.tsx       ← Motor context (plus | erpnext)
│       └── ErpProfileContext.tsx     ← Alias backward-compat
│
├── server/
│   ├── erp/
│   │   ├── routes.ts                ← /api/erp/* (= /api/soe/*)
│   │   └── index.ts                 ← Setup + alias soe→erp
│   │
│   ├── retail/
│   │   ├── routes.ts                ← /api/retail/*
│   │   ├── index.ts
│   │   ├── sync-service.ts
│   │   └── plus-sync.ts
│   │
│   ├── plus/
│   │   ├── client.ts                ← HTTP client → Plus :8080
│   │   ├── routes.ts
│   │   ├── proxy.ts
│   │   ├── launcher.ts
│   │   └── sso.ts
│   │
│   └── erpnext/
│       ├── routes.ts
│       └── index.ts
│
└── shared/
    └── schema.ts                    ← Tabelas SOE + Retail
```

---

## 4. Motor de Execução (Adapter Pattern)

O SOE usa um **padrão de adapter** para rotear operações para o motor correto:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SOEOMOTOR — ADAPTER PATTERN                        │
│                                                                      │
│  SoeMotorContext.tsx                                                 │
│                                                                      │
│  export type SoeMotor = "plus" | "erpnext"                          │
│                                                                      │
│  Persistência: localStorage["arcadia_soe_motor"]                    │
│                                                                      │
│  getApiUrl(localPath, plusPath, erpnextPath?)                       │
│                                                                      │
│  ┌──────── motor = "plus" ────────────────────────────────────┐     │
│  │  → /plus/api{plusPath}                                      │     │
│  │  → Passa pelo proxy transparente do Plus                   │     │
│  │  → Arcádia Plus (Laravel) em :8080                         │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  ┌──────── motor = "erpnext" ─────────────────────────────────┐     │
│  │  → erpnextPath ou localPath                                │     │
│  │  → ERPNext API (ERPNEXT_URL env var)                       │     │
│  │  → Autenticado via ERPNEXT_API_KEY + ERPNEXT_API_SECRET    │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  ┌──────── motor = nativo (fallback) ─────────────────────────┐     │
│  │  → localPath (/api/erp/*)                                  │     │
│  │  → PostgreSQL local via Drizzle ORM                         │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  Seleção na UI: SOE.tsx → Config tab → Dropdown de motor           │
│  Plus ativo: isERPNextConnected verifica /api/erpnext/connections   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Domínios e Abas do SOE

```
┌─────────────────────────────────────────────────────────────────────┐
│  SOE.tsx — 9 ABAS PRINCIPAIS                                         │
│                                                                      │
│  ┌── Tab: dashboard ──────────────────────────────────────────┐    │
│  │  • Stats: clientes, produtos, pedidos, total vendas        │    │
│  │  • Cards com indicadores-chave do negócio                  │    │
│  │  • Acesso rápido às seções                                 │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌── Tab: persons (Pessoas) ───────────────────────────────────┐   │
│  │  • Clientes, Fornecedores, Funcionários, Técnicos, Parceiros│   │
│  │  • Busca + filtro por papel (role)                         │   │
│  │  • Campos: nome, CPF/CNPJ, email, telefone, endereço       │   │
│  │  • Tabelas: persons + person_roles                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌── Tab: products (Produtos) ─────────────────────────────────┐   │
│  │  • Cadastro de produtos/serviços                           │   │
│  │  • Rastreamento: IMEI, Número de Série, sem rastreamento   │   │
│  │  • Grupos de produto, unidades (UN/KG/M/L/CX/PC)          │   │
│  │  • Estoque por produto, devices batch import               │   │
│  │  • Tabela: products + mobile_devices                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌── Tab: sales (Vendas) ──────────────────────────────────────┐   │
│  │  • Pedidos de venda                                        │   │
│  │  • Status: draft → confirmed → delivered                   │   │
│  │  • Geração de NF-e a partir do pedido                     │   │
│  │  • Formas de pagamento: Dinheiro/Cartão/PIX/Boleto/Prazo  │   │
│  │  • Tabelas: sales_orders + sales_order_items               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌── Tab: purchases (Compras) ─────────────────────────────────┐   │
│  │  • Pedidos de compra                                       │   │
│  │  • Associados a fornecedores                               │   │
│  │  • Tabelas: purchase_orders + purchase_order_items         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌── Tab: financial (Financeiro) ──────────────────────────────┐   │
│  │  • Visão financeira consolidada                            │   │
│  │  • Planos de pagamento e parcelamento                      │   │
│  │  • Tabelas: fin_payment_methods + fin_payment_plans        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌── Tab: crm ─────────────────────────────────────────────────┐   │
│  │  • Módulo CRM inline no SOE                                │   │
│  │  • Integrado via useTenantFeatures (feature: crm)          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌── Tab: sync (Sincronização) ────────────────────────────────┐   │
│  │  • Status dos motores (Plus/ERPNext)                       │   │
│  │  • Módulos ativos/inativos do tenant                       │   │
│  │  • Botões de sync manual por entidade                      │   │
│  │  • Indica se Plus está online (:8080)                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌── Tab: config (Configuração) ───────────────────────────────┐   │
│  │  • Dados da empresa: razão social, CNPJ, regime tributário │   │
│  │  • Inscrição estadual/municipal                            │   │
│  │  • Segmento de negócio                                    │   │
│  │  • Seletor de motor: Plus ou ERPNext                       │   │
│  │  • Tabela: erp_config + erp_segments                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Tabelas PostgreSQL — SOE Core

### 6.1 — erp_connections (Conexões com ERPs externos)

```
erp_connections
├── id              serial PK
├── userId          FK → users.id
├── erpType         "erpnext" | "plus" | "omie" | etc.
├── name            Nome da conexão
├── url             URL do ERP
├── apiKey          Chave de API
├── apiSecret       Secret
├── isActive        boolean
└── createdAt, updatedAt
```

### 6.2 — erp_segments (Segmentos de Negócio)

```
erp_segments
├── id              serial PK
├── name            Nome (Varejo, Serviços, Indústria, etc.)
├── description     Descrição
├── icon            Ícone
└── createdAt
```

### 6.3 — erp_config (Configuração da Empresa)

```
erp_config
├── id              serial PK
├── userId          FK → users.id
├── companyName     Razão Social
├── tradeName       Nome Fantasia
├── taxId           CNPJ
├── taxRegime       simples | lucro_presumido | lucro_real
├── stateRegistration  Inscrição Estadual
├── cityRegistration   Inscrição Municipal
├── segmentId       FK → erp_segments.id
├── address         Endereço completo
└── createdAt, updatedAt
```

### 6.4 — customers (Clientes)

```
customers
├── id              serial PK
├── userId          FK → users.id
├── code            Código interno
├── name            Nome
├── email           E-mail
├── phone           Telefone
├── document        CPF/CNPJ
├── type            company | individual
├── address         Endereço
└── createdAt, updatedAt
```

### 6.5 — suppliers (Fornecedores)

```
suppliers
├── id              serial PK
├── userId          FK → users.id
├── code            Código interno
├── name            Nome/Razão Social
├── email, phone
├── document        CNPJ/CPF
└── createdAt, updatedAt
```

### 6.6 — products (Produtos)

```
products
├── id              serial PK
├── userId          FK → users.id
├── code            Código/SKU
├── name            Nome do produto
├── description
├── price           Decimal(10,2)
├── costPrice       Preço de custo
├── unit            UN | KG | M | L | CX | PC
├── stock           Estoque atual
├── minStock        Estoque mínimo
├── groupId         Grupo de produto
├── requiresSerialTracking  boolean
├── trackingType    none | imei | serial
└── createdAt, updatedAt
```

### 6.7 — sales_orders + sales_order_items

```
sales_orders
├── id              serial PK
├── userId          FK → users.id
├── customerId      FK → customers.id
├── orderNumber     Número do pedido
├── status          draft | confirmed | delivered | cancelled
├── total           Decimal(10,2)
├── paymentMethod   dinheiro | cartao_credito | pix | boleto | prazo
└── createdAt, updatedAt

sales_order_items
├── id              serial PK
├── orderId         FK → sales_orders.id
├── productId       FK → products.id
├── quantity        integer
├── unitPrice       Decimal(10,2)
└── total           Decimal(10,2)
```

### 6.8 — purchase_orders + purchase_order_items

```
purchase_orders
├── id              serial PK
├── userId          FK → users.id
├── supplierId      FK → suppliers.id
├── orderNumber
├── status          draft | confirmed | received | cancelled
├── total           Decimal(10,2)
└── createdAt, updatedAt

purchase_order_items
├── id              serial PK
├── orderId         FK → purchase_orders.id
├── productId       FK → products.id
├── quantity, unitPrice, total
```

### 6.9 — persons + person_roles (Cadastro Unificado)

```
persons
├── id              serial PK
├── tenantId        FK → tenants.id
├── fullName
├── cpfCnpj
├── email, phone
├── address, city, state, zipCode
├── type            company | individual
└── notes, createdAt, updatedAt

person_roles
├── id              serial PK
├── personId        FK → persons.id
├── role            customer | supplier | employee | technician | partner
└── isActive
```

---

## 7. Tabelas PostgreSQL — Módulo Varejo (Retail)

### 7.1 — Estrutura Operacional

```
retail_stores           → Lojas físicas
retail_warehouses       → Depósitos/Almoxarifados
retail_payment_methods  → Formas de pagamento
retail_sellers          → Vendedores
retail_commission_plans → Planos de comissão
retail_seller_goals     → Metas por vendedor
retail_store_goals      → Metas por loja
```

### 7.2 — Estoque

```
stock_transfers         → Transferências entre depósitos
stock_transfer_items    → Itens da transferência
```

### 7.3 — Dispositivos Móveis (Eletrônicos)

```
mobile_devices
├── id              serial PK
├── productId       FK → products.id
├── imei            varchar (único)
├── imei2           varchar (chip duplo)
├── serial          Número de série
├── status          em_estoque | vendido | locado | devolucao | avaliacao
├── color, storage, ram
├── purchasePrice, salePrice
└── supplierId, createdAt

device_evaluations      → Avaliação de aparelhos usados
device_history          → Histórico completo do dispositivo
```

### 7.4 — PDV (Ponto de Venda)

```
pos_sessions            → Sessões de caixa (abertura/fechamento)
pos_sales               → Vendas PDV
pos_sale_items          → Itens das vendas PDV
```

### 7.5 — Planos de Pagamento

```
payment_plans           → Planos parcelados
payment_plan_installments → Parcelas
lease_payments          → Pagamentos de locação
```

---

## 8. API REST Completa (/api/soe/* = /api/erp/*)

> O alias `/api/soe/*` é convertido automaticamente para `/api/erp/*`
> no middleware do `server/erp/index.ts`.

### 8.1 — Conexões ERP

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/soe/connections` | Lista conexões do usuário |
| POST | `/api/soe/connections` | Cria nova conexão |
| POST | `/api/soe/connections/:id/test` | Testa conectividade |
| DELETE | `/api/soe/connections/:id` | Remove conexão |

### 8.2 — Tarefas ERP (Sync Jobs)

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/soe/tasks` | Lista tarefas de sync |
| POST | `/api/soe/tasks` | Cria nova tarefa |
| POST | `/api/soe/tasks/:id/execute` | Executa tarefa manualmente |
| DELETE | `/api/soe/tasks/:id` | Remove tarefa |
| GET | `/api/soe/tasks/:id/executions` | Histórico de execuções |

### 8.3 — Clientes

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/soe/customers` | Lista clientes (paginado) |
| POST | `/api/soe/customers` | Cria cliente |
| PUT | `/api/soe/customers/:id` | Atualiza cliente |
| DELETE | `/api/soe/customers/:id` | Exclui cliente |

### 8.4 — Fornecedores

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/soe/suppliers` | Lista fornecedores |
| POST | `/api/soe/suppliers` | Cria fornecedor |
| PUT | `/api/soe/suppliers/:id` | Atualiza |
| DELETE | `/api/soe/suppliers/:id` | Exclui |

### 8.5 — Pessoas (Cadastro Unificado)

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/soe/persons` | Lista com filtro por role/search |
| GET | `/api/soe/persons/:id` | Detalhe + roles |
| POST | `/api/soe/persons` | Cria pessoa + roles |
| PUT | `/api/soe/persons/:id` | Atualiza pessoa + roles |
| DELETE | `/api/soe/persons/:id` | Exclui pessoa (cascade roles) |

### 8.6 — Produtos

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/soe/products` | Lista produtos |
| POST | `/api/soe/products` | Cria produto |
| PUT | `/api/soe/products/:id` | Atualiza |
| DELETE | `/api/soe/products/:id` | Exclui |
| GET | `/api/soe/products/:id/devices` | Dispositivos do produto |
| POST | `/api/soe/products/:id/devices/batch` | Import batch de IMEIs |
| GET | `/api/soe/products/:id/stock-count` | Contagem de estoque |

### 8.7 — Pedidos de Venda

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/soe/sales-orders` | Lista pedidos |
| POST | `/api/soe/sales-orders` | Cria pedido (com itens) |
| POST | `/api/soe/sales-orders/:id/confirm` | Confirma pedido |
| POST | `/api/soe/sales-orders/:id/generate-nfe` | Gera NF-e |
| DELETE | `/api/soe/sales-orders/:id` | Cancela/Exclui |

### 8.8 — Pedidos de Compra

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/soe/purchase-orders` | Lista pedidos |
| POST | `/api/soe/purchase-orders` | Cria pedido |
| DELETE | `/api/soe/purchase-orders/:id` | Exclui |

### 8.9 — Dados e Configuração

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/soe/stats` | Dashboard — totais de clientes/produtos/pedidos/receita |
| GET | `/api/soe/data/:connectionId/:dataType` | Dados via conexão ERP |
| GET | `/api/soe/segments` | Lista segmentos |
| POST | `/api/soe/segments` | Cria segmento |
| POST | `/api/soe/segments/seed` | Popula segmentos padrão |
| GET | `/api/soe/config` | Configuração da empresa |
| POST | `/api/soe/config` | Salva configuração |

### 8.10 — Módulos do Tenant

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/soe/tenant/modules` | Módulos ativos do tenant atual |
| PUT | `/api/soe/tenant/modules` | Ativa/desativa módulos |

---

## 9. API REST — Módulo Varejo (/api/retail/*)

### 9.1 — Estrutura Operacional

| Módulo | Endpoints | Operações |
|--------|-----------|-----------|
| Activity Feed | `/activity-feed` | GET, mark-read |
| Payment Methods | `/payment-methods` | CRUD |
| Sellers | `/sellers` | CRUD |
| Commission Plans | `/commission-plans` | CRUD |
| Price Tables | `/price-tables` | CRUD |
| Promotions | `/promotions` | CRUD |
| Product Types | `/product-types` | CRUD + detail |
| Stores | `/stores` | CRU |
| Warehouses | `/warehouses` | CRUD |

### 9.2 — Estoque

| Módulo | Endpoints | Operações |
|--------|-----------|-----------|
| Warehouse Stock | `/warehouse-stock` | GET list + summary |
| Stock Movements | `/stock-movements` | GET + POST |
| Product Serials | `/product-serials` | CRUD |
| Stock Transfers | `/stock-transfers` | CRUD + status |
| Stock Alerts | `/stock-alerts` | GET |
| Inventories | `/inventories` | CRUD + count + apply |

### 9.3 — Dispositivos (Mobile/Eletrônicos)

| Módulo | Endpoints | Operações |
|--------|-----------|-----------|
| Devices | `/devices` | CRUD + IMEI lookup |
| Evaluations | `/evaluations` | CRUD + approve + reject |

### 9.4 — Serviços

| Módulo | Endpoints | Operações |
|--------|-----------|-----------|
| Service Orders | `/service-orders` | CRUD + complete-preparation + items |
| Warranties | `/warranties` | CRUD + check IMEI + claim |

### 9.5 — PDV

| Módulo | Endpoints | Operações |
|--------|-----------|-----------|
| POS Sessions | `/pos-sessions` | GET + open + close |
| Cash Movements | `/cash-movements` | GET + POST |

### 9.6 — Relatórios

| Endpoint | Descrição |
|----------|-----------|
| `/reports/os-by-status` | OS agrupadas por status |
| `/reports/os-by-technician` | OS agrupadas por técnico |

**Total: ~120 endpoints no módulo SOE (Core + Retail)**

---

## 10. Dependências Externas do SOE

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DEPENDÊNCIAS DO SOE                               │
│                                                                      │
│  ┌──── Arcádia Plus (Laravel) ────────────────────────────────┐    │
│  │  Host: :8080 (mesmo servidor) ou externo                   │    │
│  │  Env: PLUS_URL (se externo)                                │    │
│  │  Proxy: /plus/* → :8080                                   │    │
│  │  SSO: token compartilhado via plus/sso.ts                  │    │
│  │  Sync: retail/plus-sync.ts + retail/sync-service.ts       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌──── ERPNext/Frappe ─────────────────────────────────────────┐   │
│  │  Host: ERPNEXT_URL (env var no servidor)                    │   │
│  │  Auth: ERPNEXT_API_KEY + ERPNEXT_API_SECRET                 │   │
│  │  Entidades: Customer, Supplier, Item, Sales Order           │   │
│  │  Rotas: server/erpnext/routes.ts → /api/erpnext/*          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──── Arcádia Fisco (:8002) ──────────────────────────────────┐   │
│  │  Geração de NF-e a partir do pedido de venda               │   │
│  │  POST /api/soe/sales-orders/:id/generate-nfe               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──── PostgreSQL ─────────────────────────────────────────────┐   │
│  │  DATABASE_URL env var                                       │   │
│  │  Motor padrão (nativo) sem Plus/ERPNext                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 11. Variáveis de Ambiente Necessárias para Deploy

```bash
# PostgreSQL (obrigatório)
DATABASE_URL=postgresql://user:pass@host:5432/arcadia

# ERPNext (opcional — apenas se motor = "erpnext")
ERPNEXT_URL=https://seu-erpnext.com
ERPNEXT_API_KEY=sua-chave
ERPNEXT_API_SECRET=seu-secret

# Arcádia Plus (opcional — apenas se motor = "plus")
PLUS_URL=http://localhost:8080    # ou URL externa do Plus

# Fisco (para geração de NF-e via SOE)
FISCO_URL=http://localhost:8002   # ou URL externa do Fisco
```

---

## 12. Checklist de Export para Deploy Manual

### Frontend
- [ ] `client/src/pages/SOE.tsx`
- [ ] `client/src/pages/ERP.tsx`
- [ ] `client/src/contexts/SoeMotorContext.tsx`
- [ ] `client/src/contexts/ErpProfileContext.tsx`

### Backend
- [ ] `server/erp/routes.ts`
- [ ] `server/erp/index.ts`
- [ ] `server/retail/routes.ts`
- [ ] `server/retail/index.ts`
- [ ] `server/retail/sync-service.ts`
- [ ] `server/retail/plus-sync.ts`
- [ ] `server/plus/client.ts`
- [ ] `server/plus/routes.ts`
- [ ] `server/plus/proxy.ts`
- [ ] `server/plus/launcher.ts`
- [ ] `server/plus/sso.ts`
- [ ] `server/erpnext/routes.ts`
- [ ] `server/erpnext/index.ts`

### Schema e Banco
- [ ] `shared/schema.ts` (tabelas: L348, L3303–3517, L5082–5617, L6204)
- [ ] Rodar `drizzle-kit push` no servidor para criar as tabelas
- [ ] Verificar variável `DATABASE_URL` no servidor

### Configuração do Servidor
- [ ] `.env` com `DATABASE_URL` (obrigatório)
- [ ] `.env` com `ERPNEXT_*` (se usar motor ERPNext)
- [ ] `.env` com `PLUS_URL` (se usar motor Plus)
- [ ] Confirmar que `:8080` (Plus) está acessível se necessário

---

## 13. Resumo Visual do Módulo

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ARCÁDIA SOE — STACK COMPLETO                      │
│                                                                      │
│  URL /soe → SOE.tsx (2.414L)                                        │
│                                                                      │
│  9 Abas: Dashboard │ Pessoas │ Produtos │ Vendas │ Compras           │
│          Financeiro │ CRM    │ Sync     │ Config                     │
│                                                                      │
│  ┌─── Motor (Adapter) ────────────────────────────────────────┐    │
│  │  localStorage["arcadia_soe_motor"] = "plus" | "erpnext"   │    │
│  │                                                             │    │
│  │  plus    → /plus/api/*  → Arcádia Plus :8080 (Laravel)    │    │
│  │  erpnext → ERPNext API  → ERPNEXT_URL externo             │    │
│  │  nativo  → /api/soe/*  → PostgreSQL local (Drizzle)       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─── Backend ────────────────────────────────────────────────┐    │
│  │  /api/soe/* → /api/erp/*  (alias automático)              │    │
│  │  server/erp/routes.ts (1.343L) → 35+ endpoints core       │    │
│  │  server/retail/routes.ts (5.218L) → 85+ endpoints varejo  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─── Banco de Dados ─────────────────────────────────────────┐    │
│  │  Core: customers, suppliers, products, sales_orders,        │    │
│  │        purchase_orders, persons, erp_config, erp_segments   │    │
│  │                                                             │    │
│  │  Retail: retail_stores, retail_warehouses, mobile_devices,  │    │
│  │          device_evaluations, pos_sessions, pos_sales,        │    │
│  │          stock_transfers, payment_plans (20+ tabelas)       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─── Integrações ────────────────────────────────────────────┐    │
│  │  Arcádia Plus :8080 │ ERPNext/Frappe │ Fisco :8002         │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```
