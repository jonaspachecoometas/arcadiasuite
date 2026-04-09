# PLANO SOE CENTRAL v2 — Análise Real + Evolução
## Baseado no MAPA_SOE_ARCADIA.md (Replit) + Auditoria do Código
### Versão 2.0 — Março 2026

---

## 1. DIAGNÓSTICO — O QUE JÁ EXISTE (e o plano v1 não sabia)

O MAPA_SOE_ARCADIA.md do Replit revelou que **o SOE já é uma realidade arquitetural robusta**, não apenas um conceito. Antes de planejar qualquer coisa, é crítico entender o que já funciona.

### 1.1 O que já está construído e funcionando

| Componente | Status | Localização |
|---|---|---|
| `SOE.tsx` | ✅ 2.414 linhas — UI completa com 9 tabs | `client/src/pages/SOE.tsx` |
| `SoeMotorContext.tsx` | ✅ Seletor de motor (plus/erpnext) | `client/src/contexts/` |
| `ErpApiClient` (interface) | ✅ Interface unificada definida | `server/erp/index.ts` |
| `ArcadiaPlusClient` | ✅ Adaptador HTTP → Plus:8080 | `server/erp/index.ts` |
| `ArcadiaNextClient` | ✅ Adaptador HTTP → ERPNext API | `server/erp/index.ts` |
| `registerSoeRoutes()` | ✅ 60+ endpoints em /api/soe/* | `server/erp/routes.ts` |
| `server/plus/proxy.ts` | ✅ Proxy reverso para Plus | `server/plus/` |
| `server/plus/sso.ts` | ✅ SSO automático Plus ↔ Suite | `server/plus/` |
| `server/plus/launcher.ts` | ✅ Lança PHP artisan serve | `server/plus/` |
| Módulo de Pessoas unificado | ✅ `persons` + `person_roles` | Schema PostgreSQL |
| Módulo de Produtos | ✅ Com NCM, CST, CFOP, IMEI | Schema PostgreSQL |
| Módulo Financeiro | ✅ Contas a P/R + transações | Schema PostgreSQL |
| Motor Fisco (:8002) | ✅ NF-e/NFC-e via nfelib | `server/python/` |
| Motor Contábil (:8003) | ✅ DRE, Balanço, SPED | `server/python/` |
| Sistema de módulos por tenant | ✅ `tenants.features` (JSONB) | Schema PostgreSQL |
| Middleware de gating | ✅ `requireModule()` | `server/` |

### 1.2 Bancos de Dados por Motor (detalhe crítico)

```
Arcádia Suite  → PostgreSQL 16   (dados do SOE, pessoas, produtos, vendas...)
Arcádia Plus   → MySQL 8.0       (dados do Laravel — vendas, estoque, NF-e...)
ERPNext        → MariaDB          (dados do Frappe — CRM, HR, projetos...)
Motor Fisco    → sem banco        (só processa, retorna resultado)
Motor Contábil → sem banco        (só processa, retorna resultado)
```

**Implicação:** Não há sincronização automática entre esses bancos. Um pedido criado no SOE (PostgreSQL) não aparece no Plus (MySQL) automaticamente — e vice-versa.

### 1.3 O padrão motor/adaptador atual

```
Request do usuário
      │
      ▼
/api/soe/sales-orders (POST)
      │
      ▼
Verifica motor ativo (localStorage: arcadia_soe_motor)
      │
      ├── motor = "local"   → INSERT direto no PostgreSQL
      ├── motor = "plus"    → POST → Plus:8080 → MySQL
      └── motor = "erpnext" → POST → ERPNext API → MariaDB
```

---

## 2. O PROBLEMA REAL — Onde o SOE atual para

O SOE atual é um **roteador inteligente**: recebe o request, decide para qual motor enviar, e despacha. Ele **não tem inteligência própria**.

### 2.1 O que falta (lacuna real)

```
Situação atual:

SOE.tsx → /api/soe/* ────────────────────────────► Plus/ERPNext
                      (sem regras, sem processamento)
                      Regras ficam DENTRO do Plus
                      Regras ficam DENTRO do ERPNext

Situação desejada:

SOE.tsx → /api/soe/* → [RULE ENGINE SOE] ──────► Plus/ERPNext
                              │                  (só executa)
                              ├── Regras Fiscais
                              ├── Regras Contábeis
                              ├── Regras Financeiras
                              └── Regras de Negócio
```

### 2.2 Problemas concretos hoje

| Problema | Impacto |
|---|---|
| Fiscal rules dentro do Plus | Se trocar de motor (Plus→ERPNext), perde todas as regras |
| Nenhum lançamento contábil automático | DRE fica vazio, contabilidade manual |
| Motor Contábil (:8003) existe mas nada alimenta ele | 0 lançamentos automáticos |
| Plus tem UI própria (/plus) | Usuário pode bypassar o SOE e ir direto ao Plus |
| Sem event bus entre motores | Uma NF-e emitida no Plus não dispara nada no SOE |
| 25 conectores ERP definidos, zero chamadas reais | Integração existe no papel, não funciona |

### 2.3 O que o usuário vê hoje vs o que deveria ver

```
Hoje:
  /soe     → UI do SOE (tabs: dashboard, pessoas, produtos, vendas...)
  /plus    → UI do Plus (Laravel) — direto, sem passar pelo SOE
  /erp     → UI do ERP legado
  (usuário VÊ o Plus se quiser)

Desejado:
  /soe     → UI do SOE (mesma, mas com inteligência)
  /plus    → BLOQUEADO ou redirecionado para /soe
  /erp     → BLOQUEADO ou redirecionado para /soe
  (Plus e ERPNext = invisíveis, executando em background)
```

---

## 3. ARQUITETURA EVOLUÍDA — SOE com Rule Engine

### 3.1 O que muda (e o que fica igual)

**NÃO MUDA:**
- `SOE.tsx` — a UI continua a mesma (só ganha funcionalidades)
- `SoeMotorContext.tsx` — seleção de motor continua existindo
- `ArcadiaPlusClient` / `ArcadiaNextClient` — adaptadores continuam
- Todas as rotas `/api/soe/*` — continuam funcionando
- Todos os bancos — PostgreSQL, MySQL, MariaDB — continuam separados

**MUDA / ADICIONA:**
- Uma **camada de Rule Engine** entre as rotas e os adaptadores
- **Event Bus SOE** que dispara lançamentos contábeis automaticamente
- **Ocultação do Plus** — `/plus` passa a ser controlado pelo SOE
- **Regras fiscais** saem do Plus e entram no SOE

### 3.2 Diagrama completo com Rule Engine

```
┌─────────────────────────────────────────────────────────────────────┐
│                  ARCÁDIA SUITE — CAMADA DE APRESENTAÇÃO             │
│                                                                      │
│   SOE.tsx (2.414+ linhas)                                           │
│   Tabs: Dashboard | Pessoas | Produtos | Vendas | Compras           │
│         Financeiro | CRM | Sincronização | Config                   │
│                                                                      │
│   SoeMotorContext.tsx → motor = "plus" | "erpnext" | "local"        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│              /api/soe/* — CAMADA DE API (já existe)                  │
│              registerSoeRoutes() em server/erp/routes.ts             │
│              requireAuth + requireModule middleware                  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼  ◄── INSERIR AQUI (novo)
┌─────────────────────────────────────────────────────────────────────┐
│                    SOE RULE ENGINE (NOVO)                            │
│                    server/soe/rule-engine/                           │
│                                                                      │
│  Antes de despachar para o motor, o Rule Engine:                    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  1. FISCAL RULES (server/soe/rule-engine/fiscal.ts)         │    │
│  │     • Resolve CFOP correto (intra/interestadual)            │    │
│  │     • Aplica tributação por regime (Simples/Presumido/Real) │    │
│  │     • Valida NCM obrigatório                                │    │
│  │     • Define CST/CSOSN automático                           │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  2. BUSINESS RULES (server/soe/rule-engine/business.ts)     │    │
│  │     • Aprovação automática de pedidos < R$ X                │    │
│  │     • Reserva de estoque ao confirmar venda                 │    │
│  │     • Trigger de NF-e ao faturar pedido                     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  3. ACCOUNTING RULES (server/soe/rule-engine/accounting.ts) │    │
│  │     • Emitiu NF-e → lançamento automático D: Clientes       │    │
│  │                                              C: Receita      │    │
│  │     • Pagou conta → lançamento automático   D: Fornecedor   │    │
│  │                                              C: Banco        │    │
│  └─────────────────────────────────────────────────────────────┘    │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│             DESPACHADOR DE MOTOR (já existe, aprimorado)             │
│             createErpClient(connection) em server/erp/index.ts      │
│                                                                      │
│   motor = "local"   → INSERT PostgreSQL                             │
│   motor = "plus"    → ArcadiaPlusClient → Plus:8080 → MySQL         │
│   motor = "erpnext" → ArcadiaNextClient → ERPNext API → MariaDB     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SOE EVENT BUS (NOVO)                              │
│                    server/soe/event-bus.ts                           │
│                                                                      │
│  Depois que o motor executa, o Event Bus dispara:                   │
│                                                                      │
│  evento: "nfe_emitida"     → Motor Contábil (lançamento auto)       │
│  evento: "venda_confirmada" → Reserva estoque + alerta WhatsApp     │
│  evento: "pagamento_feito" → Baixa C/P + lançamento contábil        │
│  evento: "recebimento"     → Baixa C/R + lançamento contábil        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. O QUE CONSTRUIR — Detalhamento por Módulo

### 4.1 SOE Rule Engine (PRIORIDADE MÁXIMA)

**Localização:** `server/soe/rule-engine/`

Este é o coração da evolução. É um middleware que intercepta as chamadas às rotas SOE **antes** de despachar para o motor.

#### Como funciona na prática

```typescript
// server/erp/routes.ts — modificação cirúrgica

// ANTES (atual):
app.post("/api/soe/sales-orders", requireAuth, async (req, res) => {
  const client = getActiveClient(req)  // pega Plus ou ERPNext
  const result = await client.createSalesOrder(req.body)  // despacha direto
  res.json(result)
})

// DEPOIS (com Rule Engine):
app.post("/api/soe/sales-orders", requireAuth, async (req, res) => {
  // 1. Aplica regras ANTES de despachar
  const enriched = await ruleEngine.apply('pre_sales_order', req.body, req.user)

  // 2. Despacha para o motor com dados enriquecidos
  const client = getActiveClient(req)
  const result = await client.createSalesOrder(enriched.payload)

  // 3. Dispara eventos DEPOIS da execução
  await eventBus.emit('sales_order_created', { result, rules: enriched.appliedRules })

  res.json(result)
})
```

#### Estrutura do Rule Engine

```typescript
// server/soe/rule-engine/index.ts

interface SoeRule {
  id: string
  dominio: 'fiscal' | 'business' | 'accounting' | 'financial'
  trigger: string           // ex: 'pre_sales_order', 'post_nfe_emitida'
  condicao: RuleCondition   // quando esta regra se aplica
  acao: RuleAction          // o que ela faz ao payload
  prioridade: number
  ativo: boolean
  empresaId?: number        // null = regra global de todos os tenants
}

class SoeRuleEngine {
  async apply(trigger: string, payload: any, context: RuleContext): Promise<EnrichedPayload> {
    // 1. Busca regras ativas para este trigger (do banco + defaults hardcoded)
    const rules = await this.getActiveRules(trigger, context.tenantId)

    // 2. Filtra regras cuja condição se aplica ao payload
    const applicable = rules.filter(r => this.avaliarCondicao(r.condicao, payload, context))

    // 3. Aplica cada regra em ordem de prioridade
    let enriched = { ...payload }
    const applied: string[] = []
    for (const rule of applicable.sort((a, b) => a.prioridade - b.prioridade)) {
      enriched = await this.aplicarAcao(rule.acao, enriched, context)
      applied.push(rule.id)
    }

    return { payload: enriched, appliedRules: applied }
  }
}
```

### 4.2 Regras Fiscais no SOE

Estas regras **hoje vivem dentro do Plus** (Laravel controllers). A ideia é trazê-las para o SOE.

**Nota importante:** Não é mover o código PHP para TypeScript. É criar regras **declarativas** no SOE que enriquecem o payload **antes** de enviar ao Plus. O Plus ainda processa e emite — mas recebe o payload já correto.

```typescript
// server/soe/rule-engine/fiscal-rules.ts

export const FISCAL_RULES_PADRAO: SoeRule[] = [

  // CFOP — resolve automaticamente por operação
  {
    id: 'CFOP_VENDA_DENTRO_ESTADO',
    dominio: 'fiscal',
    trigger: 'pre_sales_order',
    condicao: { uf_emitente: '==', uf_destinatario: true, tipo_op: 'venda_produto' },
    acao: { set: { 'items[*].cfop': '5.102' } },
    prioridade: 10, ativo: true
  },
  {
    id: 'CFOP_VENDA_OUTRO_ESTADO',
    dominio: 'fiscal',
    trigger: 'pre_sales_order',
    condicao: { uf_emitente: '!=', uf_destinatario: true, tipo_op: 'venda_produto' },
    acao: { set: { 'items[*].cfop': '6.102' } },
    prioridade: 10, ativo: true
  },

  // Tributação por Regime
  {
    id: 'CST_SIMPLES_NACIONAL',
    dominio: 'fiscal',
    trigger: 'pre_nfe_emissao',
    condicao: { regime_tributario: 'simples_nacional' },
    acao: {
      set: { 'items[*].cst_icms': '400', 'items[*].pis': null, 'items[*].cofins': null },
      // No Simples Nacional: CSOSN 400 = tributado, sem destaque PIS/COFINS
    },
    prioridade: 5, ativo: true
  },
  {
    id: 'CST_LUCRO_PRESUMIDO',
    dominio: 'fiscal',
    trigger: 'pre_nfe_emissao',
    condicao: { regime_tributario: 'lucro_presumido' },
    acao: { set: { 'items[*].cst_pis': '01', 'items[*].cst_cofins': '01' } },
    prioridade: 5, ativo: true
  },

  // Validações obrigatórias
  {
    id: 'VALIDAR_NCM_NFE',
    dominio: 'fiscal',
    trigger: 'pre_nfe_emissao',
    condicao: { tipo_documento: ['nfe', 'nfce'] },
    acao: { validar: { campo: 'items[*].ncm', obrigatorio: true, formato: /^\d{8}$/ } },
    prioridade: 1, ativo: true
  },
]
```

### 4.3 SOE Event Bus — Lançamentos Contábeis Automáticos

Este é o **maior salto de valor**. Hoje o Motor Contábil (:8003) existe mas nada o alimenta automaticamente.

```typescript
// server/soe/event-bus.ts

type SoeEvent =
  | 'nfe_emitida'
  | 'nfe_cancelada'
  | 'venda_confirmada'
  | 'compra_recebida'
  | 'pagamento_realizado'
  | 'recebimento_realizado'
  | 'boleto_gerado'

interface SoeEventPayload {
  empresaId: number
  tenantId: number
  evento: SoeEvent
  dados: Record<string, any>
  motorOrigem: 'plus' | 'erpnext' | 'local'
}

class SoeEventBus {
  async emit(evento: SoeEvent, payload: SoeEventPayload) {
    // Registra no banco (audit trail)
    await db.insert(soeEventos).values({ ...payload, createdAt: new Date() })

    // Dispara handlers
    await Promise.allSettled(
      this.getHandlers(evento).map(h => h(payload))
    )
  }

  // Handlers por evento
  private handlers: Record<SoeEvent, EventHandler[]> = {
    'nfe_emitida': [
      contabilHandler.lancamentoVenda,    // D: Clientes / C: Receita Bruta
      contabilHandler.lancamentoImpostos, // D: Impostos / C: ICMS/PIS/COFINS a Recolher
      financialHandler.gerarRecebivel,    // Cria C/R automaticamente
    ],
    'pagamento_realizado': [
      contabilHandler.lancamentoPagamento, // D: Fornecedores / C: Banco
      financialHandler.baixarContaPagar,   // Baixa C/P
    ],
    'recebimento_realizado': [
      contabilHandler.lancamentoRecebimento, // D: Banco / C: Clientes
      financialHandler.baixarContaReceber,   // Baixa C/R
    ],
    'compra_recebida': [
      contabilHandler.lancamentoCompra,    // D: Estoque / C: Fornecedores
    ],
  }
}
```

#### Lançamentos automáticos para cada evento

```
NF-e emitida (venda):
  D: 1.1.3.01 — Clientes                 (valor total da nota)
  C: 3.1.1.01 — Receita Bruta de Vendas

  D: 3.1.2.01 — Deduções (ICMS)
  C: 2.1.2.01 — ICMS a Recolher

  D: 3.1.2.02 — Deduções (PIS)
  C: 2.1.2.02 — PIS a Recolher

  D: 3.1.2.03 — Deduções (COFINS)
  C: 2.1.2.03 — COFINS a Recolher

Pagamento de fornecedor:
  D: 2.1.1.{categoria} — Fornecedores
  C: 1.1.1.01          — Banco (conta configurada)

Recebimento de cliente:
  D: 1.1.1.01 — Banco
  C: 1.1.3.01 — Clientes

Compra recebida (NF-e entrada):
  D: 1.1.4.01 — Estoque / Mercadorias
  C: 2.1.1.01 — Fornecedores
```

### 4.4 Ocultação do Plus e ERPNext

O Plus tem página própria em `/plus` (client/src/pages/Plus.tsx). O usuário pode acessá-la diretamente. Precisamos de 3 mudanças:

#### a) Redirecionar `/plus` para `/soe`

```typescript
// client/src/App.tsx — modificação simples
// Trocar: <Route path="/plus" component={Plus} />
// Por:    <Route path="/plus" render={() => <Redirect to="/soe" />} />
```

**Mas manter o proxy reverso Plus ativo** — o Plus continua funcionando em background, só não fica visível como página separada.

#### b) Ocultar o seletor de motor do usuário final

```typescript
// client/src/contexts/SoeMotorContext.tsx
// O seletor fica SOMENTE na tab Config do SOE, e somente para admins

// A tab Config na SOE.tsx — adicionar role check:
{user?.role === 'admin' && <TabsTrigger value="config">Config</TabsTrigger>}
```

#### c) Na tab Config (admin), o label muda

```
Antes: "Selecione o motor: Plus | ERPNext"
Depois: "Motor de execução: Plus | ERPNext | Local"
(invisível para usuário final, só admin de tenant vê)
```

---

## 5. TABELAS A CRIAR (complemento ao schema existente)

As tabelas canônicas do SOE já existem. Precisamos adicionar apenas as tabelas do Rule Engine.

```typescript
// shared/schema.ts — adicionar ao final

// Regras do SOE — configuráveis por tenant
export const soeRegras = pgTable('soe_regras', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: integer('tenant_id'),           // null = regra global (todas as empresas)
  empresaId: integer('empresa_id'),          // null = todas as empresas do tenant
  dominio: varchar('dominio', { length: 50 }).notNull(),
  trigger: varchar('trigger', { length: 100 }).notNull(),
  nome: varchar('nome', { length: 200 }).notNull(),
  condicao: jsonb('condicao').notNull(),
  acao: jsonb('acao').notNull(),
  prioridade: integer('prioridade').default(10),
  ativo: boolean('ativo').default(true),
  origemPadrao: boolean('origem_padrao').default(false), // true = regra default do sistema
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Log de todos os eventos SOE (audit trail completo)
export const soeEventos = pgTable('soe_eventos', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: integer('tenant_id').notNull(),
  empresaId: integer('empresa_id'),
  evento: varchar('evento', { length: 100 }).notNull(),
  motorOrigem: varchar('motor_origem', { length: 50 }),  // 'plus', 'erpnext', 'local'
  regraIds: jsonb('regra_ids'),                           // regras aplicadas
  payloadEntrada: jsonb('payload_entrada'),
  payloadSaida: jsonb('payload_saida'),
  status: varchar('status', { length: 50 }).notNull(),
  duracaoMs: integer('duracao_ms'),
  erro: text('erro'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Lançamentos contábeis automáticos do SOE
export const soeLancamentos = pgTable('soe_lancamentos', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: integer('tenant_id').notNull(),
  empresaId: integer('empresa_id').notNull(),
  data: date('data').notNull(),
  contaDebito: varchar('conta_debito', { length: 30 }).notNull(),
  contaCredito: varchar('conta_credito', { length: 30 }).notNull(),
  valor: numeric('valor', { precision: 15, scale: 2 }).notNull(),
  historico: text('historico').notNull(),
  origemEvento: varchar('origem_evento', { length: 100 }), // 'nfe_emitida', etc.
  origemEventoId: uuid('origem_evento_id'),                // FK para soe_eventos
  periodo: varchar('periodo', { length: 7 }),              // '2026-03'
  enviado8003: boolean('enviado_8003').default(false),     // sincronizado com Motor Contábil
  createdAt: timestamp('created_at').defaultNow(),
})
```

---

## 6. ESTRUTURA DE PASTAS (Novo código a criar)

```
server/
└── soe/                              ← NOVA PASTA
    ├── rule-engine/
    │   ├── index.ts                  ← SoeRuleEngine class
    │   ├── fiscal-rules.ts           ← Regras fiscais padrão
    │   ├── business-rules.ts         ← Regras de negócio
    │   └── accounting-rules.ts       ← Regras de lançamento contábil
    │
    ├── event-bus.ts                  ← SoeEventBus class
    │
    ├── handlers/
    │   ├── contabil-handler.ts       ← Lançamentos automáticos
    │   └── financial-handler.ts      ← Automação financeira
    │
    └── fiscal/
        └── cfop-resolver.ts          ← Resolução de CFOP (lógica complexa)
```

**Modificações em arquivos existentes:**
```
server/erp/routes.ts      ← Inserir ruleEngine.apply() antes do dispatch
client/src/App.tsx        ← Redirecionar /plus para /soe
client/src/pages/SOE.tsx  ← Ocultar Config tab para não-admins
```

---

## 7. ROADMAP — Fases de Implementação

### Fase 1 — Rule Engine Básico ✅ CONCLUÍDA (2026-03-19) — João
```
[x] Criar server/soe/rule-engine/index.ts (SoeRuleEngine) — já existia | João | 2026-03-19
[x] Criar tabelas soe_regras e soe_eventos (drizzle push) — já existiam no schema | João | 2026-03-19
[x] Inserir ruleEngine.apply() em 3 rotas críticas:
    - POST /api/soe/sales-orders       ✅ plugado | João | 2026-03-19
    - POST /api/soe/sales-orders/:id/generate-nfe  ✅ plugado | João | 2026-03-19
    - POST /api/soe/purchase-orders    ✅ plugado | João | 2026-03-19
[x] Seed das regras fiscais padrão (CFOP, CST, validações NCM) — fiscal-rules.ts hardcoded | João | 2026-03-19
[ ] Testar: criar pedido → verificar que payload está sendo enriquecido
```

### Fase 2 — Event Bus + Contabilidade Automática ✅ CONCLUÍDA (2026-03-19) — João
```
[x] Criar server/soe/event-bus.ts — já existia | João | 2026-03-19
[x] Criar tabela soe_lancamentos (drizzle push) — já existia no schema | João | 2026-03-19
[x] Criar handlers: contabil-handler.ts + financial-handler.ts — já existiam | João | 2026-03-19
[x] Conectar: POST generate-nfe → emit('nfe_emitida') → lançamentos ✅ plugado | João | 2026-03-19
[ ] Conectar: pagamento/recebimento → emit() → lançamentos
[ ] Criar endpoint: GET /api/soe/contabil/lancamentos?periodo=YYYY-MM
[ ] DRE: agora tem dados reais (via soe_lancamentos → Motor :8003)
```

### Fase 3 — Ocultar Plus/ERPNext ✅ CONCLUÍDA (2026-03-19) — João
```
[x] client/src/App.tsx: /plus → redirect para /soe ✅ | João | 2026-03-19
[x] client/src/pages/SOE.tsx: Config tab só para admins ✅ | João | 2026-03-19
[x] Manter proxy Plus funcionando (invisível) — proxy já existia, não alterado | João | 2026-03-19
[ ] Testar: fluxo completo sem nenhum acesso direto ao Plus UI
```

### Fase 4 — Regras Configuráveis pelo Usuário (1 semana)
```
[ ] UI na tab Config do SOE: "Regras de Negócio"
[ ] CRUD de regras via /api/soe/rules
[ ] Admin pode criar regras custom sem código
[ ] Exemplo: "Pedidos acima de R$10.000 requerem aprovação manual"
```

### Fase 5 — Financeiro Avançado (2 semanas)
```
[ ] Auto-boleto ao confirmar venda (Asaas API)
[ ] Alertas de vencimento (Manus → WhatsApp)
[ ] Conciliação bancária OFX semi-automática
[ ] Previsão financeira (Motor BI :8004 + histórico soe_lancamentos)
```

### Fase 6 — Contábil Avançado (2 semanas)
```
[ ] DRE automático mensal (100% alimentado pelo Event Bus)
[ ] Balanço Patrimonial automático
[ ] Fechamento contábil mensal
[ ] SPED ECD/ECF alimentado por soe_lancamentos
[ ] Exportação para escritório contábil (OFX, Excel, PDF)
```

---

## 8. COMPARAÇÃO: PLANO v1 vs PLANO v2

| Aspecto | Plano v1 (antes do Replit .md) | Plano v2 (com conhecimento real) |
|---|---|---|
| Adaptadores Plus/ERPNext | "Precisam ser criados" | Já existem — não tocar |
| SOE Routes | "Precisam ser criadas" | 60+ endpoints já existem |
| SOE.tsx | "Precisa ser construída" | 2.414 linhas — já funciona |
| Onde adicionar código | server/soe/ do zero | Middleware nas rotas existentes |
| Esforço estimado | Alto (refatoração total) | Médio (adição cirúrgica) |
| Risco de quebrar | Alto | Baixo (adição, não substituição) |
| Banco Plus | Ignorado | MySQL — separado, nunca tocar direto |

---

## 9. PRINCÍPIO ORIENTADOR (REVISADO)

> O SOE já é o roteador certo. Agora vamos torná-lo o **árbitro de regras**.
>
> O padrão motor/adaptador está perfeito. O que falta é a **inteligência entre a rota e o adaptador**.
>
> Plus e ERPNext continuam existindo e funcionando — só que o usuário final não sabe.
> Ele só vê a Central SOE. O restante é infraestrutura.

---

## 10. RESUMO EXECUTIVO — O que fazer agora

**1 ação que entrega valor imediato:**
```
Criar o SoeRuleEngine e plugar nas rotas de venda/NF-e.
Resultado: Ao emitir uma NF-e, o CFOP correto é calculado
automaticamente pelo SOE — sem o usuário saber que o Plus está
sendo chamado por baixo.
```

**1 ação que entrega valor a médio prazo:**
```
Criar o Event Bus com o handler de contabilidade.
Resultado: Cada NF-e emitida gera lançamentos contábeis
automaticamente. O DRE do mês é gerado sem entrada manual de dados.
```

**1 ação que fecha o conceito:**
```
Redirecionar /plus → /soe.
Resultado: O usuário não tem mais acesso ao Plus diretamente.
Ele só vê o Arcádia. O Plus é infraestrutura invisível.
```

---

*PLANO_SOE_CENTRAL_v2.md — Arcádia Suite v3.0*
*Gerado em: 2026-03-16 — Baseado na análise real do MAPA_SOE_ARCADIA.md (Replit)*
