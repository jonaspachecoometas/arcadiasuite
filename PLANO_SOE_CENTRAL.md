# PLANO SOE CENTRAL — Arcádia Suite
## Orquestração Inteligente: Plus + ERPNext invisíveis, Central visível
### Versão 1.0 — Março 2026

---

## 1. ONDE ESTAMOS (Orientação Geral)

### O Projeto nasceu no Replit como…
- Uma plataforma de **escritório empresarial com IA central** (Manus Agent)
- Com proxy para o **Arcádia Plus** (Laravel/PHP, porta 8080) — ERP fiscal completo
- Com integração ao **ERPNext/Frappe** via API
- Stack principal: **React 18 + Express.js + PostgreSQL + FastAPI (Python)**

### O que JÁ existe e funciona:
| Componente | Status | Onde vive |
|---|---|---|
| Manus Agent (IA, 30+ tools) | ✅ Funcionando | `server/manus/` |
| Arcádia Plus (Laravel ERP) | ✅ Funcionando | `plus/` → porta 8080 |
| SSO Plus ↔ Suite | ✅ Funcionando | `server/plus/` |
| Motor Fiscal (nfelib) | ✅ Funcionando | `server/python/` → porta 8002 |
| Motor Contábil | ✅ Funcionando | `server/python/` → porta 8003 |
| Motor BI | ✅ Funcionando | `server/python/` → porta 8004 |
| Motor Automação | ✅ Funcionando | `server/python/` → porta 8005 |
| Motor Comunicação (Comm) | ✅ Funcionando | porta 8006 |
| Dev Center XOS (6 agentes) | ✅ Funcionando | `server/blackboard/` |
| LiteLLM Gateway | ✅ Configurado | porta 4000 |
| CRM, WhatsApp, Chat | ✅ Funcionando | `server/crm/`, `server/whatsapp/` |
| ERPNext integração | ⚠️ Parcial | `server/erp/routes.ts` |

### O que FALTA para o plano atual:
| Componente | Status |
|---|---|
| **SOE Central (Regras Unificadas)** | ❌ Não existe — este é o plano |
| Fiscal rules centralizadas (acima do Plus) | ❌ Dispersas no Plus |
| ERPNext rules centralizadas | ❌ Não existe camada de abstração |
| Contábil Avançado (lançamentos automáticos) | ❌ Motor existe, regras não |
| Financeiro Avançado (previsão, DRE automático) | ❌ Motor existe, regras não |
| Testes automatizados / CI-CD | ❌ |
| Monitoramento (APM, Sentry) | ❌ |

---

## 2. O PROBLEMA QUE VAMOS RESOLVER

### Situação Atual (problemática)
```
Usuário → Arcádia Suite
              ├── /plus → acessa Laravel diretamente (usuário VÊ o Plus)
              ├── /erp → acessa ERPNext diretamente (usuário VÊ o ERPNext)
              └── Regras fiscais ficam dentro do Plus
                  Regras contábeis ficam no Motor 8003
                  Regras ERP ficam no ERPNext
                  → Fragmentado, sem governança central
```

### Situação Desejada (SOE Central)
```
Usuário → Arcádia Suite (SOE)
              │
              ▼ [Central de Regras SOE]
              ├── Fiscal: regras unificadas (CFOP, NCM, tributação, NF-e, CT-e...)
              ├── ERP: regras de negócio (pedidos, estoque, compras...)
              ├── Contábil: regras de lançamentos, plano de contas, DRE...
              └── Financeiro: regras de fluxo, provisões, conciliação...
                        │
                        ▼ [Execução invisível]
                        ├── Plus → emite documentos, registra no banco
                        └── ERPNext → executa operações, registra no banco

              O usuário NUNCA VÊ o Plus nem o ERPNext.
              Só vê a Central SOE do Arcádia.
```

---

## 3. ARQUITETURA SOE CENTRAL

### 3.1 Diagrama Completo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       ARCÁDIA SUITE (Frontend React)                    │
│   /financeiro  /contabil  /fisco  /erp  /people  /production  /bi       │
│                   Usuário nunca acessa /plus ou ERPNext diretamente      │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              SOE — SISTEMA OPERACIONAL EMPRESARIAL (Nova Camada)        │
│                    Express.js / porta 5000 / server/soe/                │
│                                                                          │
│  ┌──────────────────────┐  ┌──────────────────────┐                    │
│  │   CENTRAL FISCAL     │  │   CENTRAL ERP         │                    │
│  │   server/soe/fiscal/ │  │   server/soe/erp/     │                    │
│  │                      │  │                        │                    │
│  │ • Regras NCM/CFOP    │  │ • Regras de pedidos    │                    │
│  │ • Políticas tribut.  │  │ • Regras de estoque    │                    │
│  │ • Emissão NF-e/NFC-e │  │ • Regras de compras    │                    │
│  │ • Cancelamento       │  │ • Regras de pessoas    │                    │
│  │ • SPED/SINTEGRA      │  │ • Integrações ext.     │                    │
│  └──────────┬───────────┘  └──────────┬─────────────┘                    │
│             │                          │                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐                    │
│  │  CENTRAL CONTÁBIL    │  │  CENTRAL FINANCEIRO   │                    │
│  │  server/soe/contabil/│  │  server/soe/financ/   │                    │
│  │                      │  │                        │                    │
│  │ • Plano de contas    │  │ • Fluxo de caixa       │                    │
│  │ • Regras de lanç.    │  │ • Contas a P/R         │                    │
│  │ • DRE automático     │  │ • Conciliação          │                    │
│  │ • Balancete          │  │ • Previsão (IA)        │                    │
│  │ • Fechamento         │  │ • Impostos             │                    │
│  └──────────┬───────────┘  └──────────┬─────────────┘                    │
│             │                          │                                  │
│             └────────────┬─────────────┘                                  │
│                          ▼                                                │
│         ┌─────────────────────────────────┐                              │
│         │   SOE RULE ENGINE (Núcleo)      │                              │
│         │   server/soe/rule-engine.ts     │                              │
│         │                                 │                              │
│         │ • Resolução de conflitos        │                              │
│         │ • Aplicação de políticas XOS    │                              │
│         │ • Audit trail de todas regras   │                              │
│         │ • Manus consulta este engine    │                              │
│         └─────────────────┬───────────────┘                              │
└────────────────────────────┼────────────────────────────────────────────┘
                             │
              ┌──────────────┼───────────────┐
              ▼              ▼               ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────────┐
│  ARCÁDIA PLUS   │ │   ERPNEXT    │ │  MOTORES PYTHON  │
│  Laravel :8080  │ │  Frappe :    │ │  8002 Fiscal     │
│  (invisível)    │ │  (invisível) │ │  8003 Contábil   │
│                 │ │              │ │  8004 BI         │
│  Emite docs     │ │  Executa ERP │ │  8005 Automação  │
│  fiscais        │ │  operacional │ │                  │
└─────────────────┘ └──────────────┘ └──────────────────┘
```

---

## 4. CENTRAL FISCAL — Detalhamento

### 4.1 O que ela resolve
O Plus tem **376 controllers** e **1.546 rotas** — tudo fiscal/operacional. A Central Fiscal **não substitui** o Plus, ela **orquestra** o Plus com regras definidas no SOE.

### 4.2 Regras que vão para a Central (tiradas do Plus)

```typescript
// server/soe/fiscal/rules.ts — Exemplo de estrutura

interface FiscalRule {
  id: string
  nome: string
  trigger: 'pre_emissao' | 'pos_emissao' | 'cancelamento' | 'validacao'
  condicao: FiscalCondition
  acao: FiscalAction
  prioridade: number
  ativo: boolean
}

// Exemplos de regras:
const REGRAS_FISCAIS: FiscalRule[] = [
  {
    id: 'NFE_CFOP_INTERESTADUAL',
    nome: 'Ajusta CFOP para operação interestadual',
    trigger: 'pre_emissao',
    condicao: { uf_emitente: '!=', uf_destinatario: true },
    acao: { ajustar_cfop: 'interestadual' },
    prioridade: 1,
    ativo: true
  },
  {
    id: 'NFE_SIMPLES_NACIONAL',
    nome: 'Aplica tributação Simples Nacional',
    trigger: 'pre_emissao',
    condicao: { regime_tributario: 'simples_nacional' },
    acao: { aplicar_cst: 'tabela_simples', remover_pis_cofins: true },
    prioridade: 2,
    ativo: true
  },
  {
    id: 'NFE_VALIDACAO_NCM',
    nome: 'Valida NCM obrigatório para NF-e',
    trigger: 'validacao',
    condicao: { tipo_documento: 'nfe' },
    acao: { validar_campo: 'ncm', obrigatorio: true },
    prioridade: 1,
    ativo: true
  }
]
```

### 4.3 Fluxo de Emissão via SOE Central

```
Usuário clica "Emitir NF-e" no Arcádia
        │
        ▼
POST /api/soe/fiscal/emitir-nfe
        │
        ▼
SOE Rule Engine: aplica REGRAS_FISCAIS (pre_emissao)
  • Verifica regime tributário
  • Aplica CFOP correto
  • Calcula impostos (ICMS, PIS, COFINS, IPI)
  • Valida NCM obrigatório
  • Adiciona dados da empresa emitente
        │
        ▼
SOE envia para Plus via API interna (invisível)
  POST http://plus:8080/api/nfe/emitir
  + token SSO automático
        │
        ▼
Plus emite via Cloud-DFE → SEFAZ
        │
        ▼
SOE recebe retorno
  • Registra no banco SOE (tabela soe_fiscal_eventos)
  • Dispara lançamento contábil automático
  • Notifica via WebSocket o frontend
        │
        ▼
Usuário vê resultado no Arcádia (nunca soube do Plus)
```

### 4.4 Tabelas SOE para Fiscal

```sql
-- Tabelas a criar no schema Arcádia (PostgreSQL)

CREATE TABLE soe_fiscal_regras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(200) NOT NULL,
  trigger VARCHAR(50) NOT NULL,
  condicao JSONB NOT NULL,
  acao JSONB NOT NULL,
  prioridade INTEGER DEFAULT 10,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE soe_fiscal_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(50) NOT NULL,  -- 'emissao_nfe', 'cancelamento', etc.
  empresa_id INTEGER NOT NULL,
  documento_chave VARCHAR(100),
  regras_aplicadas JSONB,     -- quais regras foram aplicadas
  payload_enviado JSONB,      -- o que foi enviado ao Plus
  payload_retorno JSONB,      -- o que o Plus/SEFAZ respondeu
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE soe_fiscal_configuracoes (
  empresa_id INTEGER PRIMARY KEY,
  regime_tributario VARCHAR(50),  -- simples, lucro_presumido, lucro_real
  uf VARCHAR(2),
  cnpj VARCHAR(18),
  certificado_tipo VARCHAR(20),
  aliquotas JSONB,            -- alíquotas padrão por operação
  cfops_padrao JSONB,         -- CFOPs padrão por tipo de operação
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 5. CENTRAL ERP (ERPNext/Frappe) — Detalhamento

### 5.1 O que ela resolve
O ERPNext tem **APIs complexas**. A Central ERP abstrai tudo isso em operações simples que o Arcádia entende.

### 5.2 Adapter Layer ERPNext

```typescript
// server/soe/erp/frappe-adapter.ts

interface ERPAdapter {
  // Produtos
  criarProduto(data: ProdutoSOE): Promise<ERPProduto>
  buscarProduto(codigo: string): Promise<ProdutoSOE>
  atualizarEstoque(movimentacao: MovimentacaoEstoque): Promise<void>

  // Pedidos
  criarPedidoVenda(pedido: PedidoSOE): Promise<ERPPedido>
  aprovarPedido(id: string): Promise<void>
  faturarPedido(id: string): Promise<ERPFatura>

  // Financeiro
  criarLancamento(lancamento: LancamentoSOE): Promise<ERPLancamento>
  buscarPlanoContas(): Promise<ContaContabil[]>

  // Compras
  criarPedidoCompra(data: PedidoCompraSOE): Promise<ERPPedidoCompra>
  receberMercadoria(data: RecebimentoSOE): Promise<void>
}

// As regras ficam no SOE, o adapter só traduz
class FrappeAdapter implements ERPAdapter {
  private baseUrl: string
  private apiKey: string

  async criarPedidoVenda(pedido: PedidoSOE): Promise<ERPPedido> {
    // Traduz do modelo SOE para o modelo Frappe
    const frappePedido = this.traduzirParaFrappe(pedido)

    // Envia para ERPNext (invisível para o usuário)
    const response = await fetch(`${this.baseUrl}/api/resource/Sales Order`, {
      method: 'POST',
      headers: { 'Authorization': `token ${this.apiKey}` },
      body: JSON.stringify(frappePedido)
    })

    // Traduz retorno de volta para modelo SOE
    return this.traduzirDeVoltaSOE(await response.json())
  }
}
```

### 5.3 Regras de Negócio ERP no SOE

```typescript
// server/soe/erp/rules.ts

const REGRAS_ERP = [
  {
    id: 'PEDIDO_APROVACAO_AUTOMATICA',
    nome: 'Aprovação automática até R$ 5.000',
    trigger: 'pre_aprovacao_pedido',
    condicao: { valor_total: { menor_que: 5000 } },
    acao: { aprovar_automaticamente: true }
  },
  {
    id: 'ESTOQUE_RESERVA_VENDA',
    nome: 'Reservar estoque ao confirmar venda',
    trigger: 'pos_confirmacao_venda',
    condicao: { status: 'confirmado' },
    acao: { reservar_estoque: true, gerar_separacao: true }
  },
  {
    id: 'NF_AUTOMATICA_FATURAMENTO',
    nome: 'Emite NF-e automaticamente ao faturar',
    trigger: 'pos_faturamento',
    condicao: { tipo_cliente: ['pj', 'pf_contribuinte'] },
    acao: { emitir_nfe: true, via_soe_fiscal: true }
  }
]
```

---

## 6. CENTRAL CONTÁBIL AVANÇADA

### 6.1 Motor Atual (porta 8003) + Regras SOE

O Motor Contábil Python já faz DRE e Balancete. O que falta é **alimentação automática**.

### 6.2 Lançamentos Automáticos (grande salto)

```typescript
// server/soe/contabil/auto-lancamentos.ts

interface RegrasLancamentoAuto {
  gatilho: string
  debito: string    // Conta contábil
  credito: string   // Conta contábil
  historico: string
  formula: string   // Como calcular o valor
}

const LANCAMENTOS_AUTOMATICOS: RegrasLancamentoAuto[] = [
  // Quando emite NF-e de venda
  {
    gatilho: 'emissao_nfe_venda',
    debito: '1.1.3.01',   // Clientes
    credito: '3.1.1.01',  // Receita Bruta de Vendas
    historico: 'Venda conforme NF-e {numero}',
    formula: 'valor_total_nota'
  },
  {
    gatilho: 'emissao_nfe_venda',
    debito: '3.1.2.01',   // Dedução de Receita (ICMS)
    credito: '2.1.2.01',  // ICMS a Recolher
    historico: 'ICMS s/ Venda NF-e {numero}',
    formula: 'valor_icms'
  },
  // Quando paga conta
  {
    gatilho: 'pagamento_conta',
    debito: '2.1.1.{categoria}',  // Conta a Pagar específica
    credito: '1.1.1.01',          // Banco/Caixa
    historico: 'Pagamento: {descricao}',
    formula: 'valor_pago'
  },
  // Quando recebe pagamento
  {
    gatilho: 'recebimento',
    debito: '1.1.1.01',           // Banco/Caixa
    credito: '1.1.3.01',          // Clientes
    historico: 'Recebimento: {descricao}',
    formula: 'valor_recebido'
  },
  // Compra de mercadoria
  {
    gatilho: 'entrada_nfe_compra',
    debito: '1.1.4.01',   // Estoque
    credito: '2.1.1.01',  // Fornecedores
    historico: 'Compra conforme NF-e {numero} / {fornecedor}',
    formula: 'valor_mercadorias'
  }
]
```

### 6.3 DRE Automático via SOE

```
Usuário pede DRE do mês
      │
      ▼
SOE Contábil consulta:
  1. Todos lançamentos do período (tabela soe_lancamentos)
  2. Agrupa por conta contábil
  3. Aplica estrutura DRE configurada
  4. Envia para Motor Python 8003 para cálculos
  5. Retorna DRE formatado
      │
      ▼
Usuário vê DRE no /contabil do Arcádia
(Nunca soube que teve lançamentos automáticos de NF-e, pagamentos, etc.)
```

---

## 7. CENTRAL FINANCEIRO AVANÇADO

### 7.1 Regras Financeiras no SOE

```typescript
// server/soe/financeiro/rules.ts

const REGRAS_FINANCEIRO = [
  {
    id: 'BOLETO_AUTO_VENCIMENTO',
    nome: 'Gerar boleto automático para vendas a prazo',
    trigger: 'pos_confirmacao_venda_prazo',
    acao: { gerar_boleto: true, via: 'asaas', vencimento: '+{prazo}_dias' }
  },
  {
    id: 'ALERTA_VENCIMENTO_3DIAS',
    nome: 'Alerta de vencimento 3 dias antes',
    trigger: 'cron_diario',
    condicao: { vencimento_em: 3 },
    acao: { notificar: ['whatsapp', 'email'], via_manus: true }
  },
  {
    id: 'PROVISAO_IMPOSTOS',
    nome: 'Provisão mensal de impostos',
    trigger: 'cron_mensal',
    acao: { calcular_provisao: ['icms', 'pis', 'cofins', 'csll', 'irpj'], registrar_lancamento: true }
  },
  {
    id: 'CONCILIACAO_AUTO',
    nome: 'Conciliação bancária automática via OFX',
    trigger: 'importacao_ofx',
    acao: { tentar_conciliar: true, confianca_minima: 0.85, pendentes_para_revisao: true }
  }
]
```

---

## 8. MANUS AGENT + SOE CENTRAL

### 8.1 O Manus consulta a Central

```
Pergunta: "Qual foi o resultado do mês passado?"
        │
        ▼
Manus → SOE Central
  • GET /api/soe/contabil/dre?periodo=2026-02
  • GET /api/soe/financeiro/fluxo?periodo=2026-02
  • GET /api/soe/fiscal/resumo?periodo=2026-02
        │
        ▼
SOE agrega dados dos motores (Python) + Plus + ERPNext
        │
        ▼
Manus recebe contexto completo e responde:
  "Faturamento: R$ 120.000
   Deduções (impostos): R$ 18.000
   Receita Líquida: R$ 102.000
   Custo das mercadorias: R$ 65.000
   Lucro Bruto: R$ 37.000
   ..."
```

### 8.2 Tools do Manus para o SOE

```typescript
// Novas tools do Manus que consultam o SOE Central

{
  name: 'consultar_situacao_fiscal',
  description: 'Consulta situação fiscal da empresa (NFs pendentes, impostos, SPED)',
  endpoint: 'GET /api/soe/fiscal/situacao'
},
{
  name: 'emitir_documento_fiscal',
  description: 'Emite NF-e, NFC-e, CT-e ou MDF-e',
  endpoint: 'POST /api/soe/fiscal/emitir'
},
{
  name: 'consultar_dre',
  description: 'Gera DRE de qualquer período',
  endpoint: 'GET /api/soe/contabil/dre'
},
{
  name: 'consultar_fluxo_caixa',
  description: 'Consulta fluxo de caixa e previsões',
  endpoint: 'GET /api/soe/financeiro/fluxo'
},
{
  name: 'registrar_lancamento_contabil',
  description: 'Registra lançamento contábil manualmente',
  endpoint: 'POST /api/soe/contabil/lancamento'
}
```

---

## 9. ESTRUTURA DE PASTAS A CRIAR

```
server/
└── soe/                           ← Nova pasta (Central SOE)
    ├── index.ts                   ← Router principal do SOE
    ├── rule-engine.ts             ← Motor de regras central
    │
    ├── fiscal/
    │   ├── routes.ts              ← GET/POST /api/soe/fiscal/*
    │   ├── rules.ts               ← Regras fiscais (CFOP, NCM, tributação)
    │   ├── emissao.ts             ← Orquestração de emissão (→ Plus)
    │   ├── plus-adapter.ts        ← Adaptador para o Plus (invisível)
    │   └── sefaz-adapter.ts       ← Comunicação direta SEFAZ (via Python 8002)
    │
    ├── erp/
    │   ├── routes.ts              ← GET/POST /api/soe/erp/*
    │   ├── rules.ts               ← Regras de negócio ERP
    │   ├── frappe-adapter.ts      ← Adaptador ERPNext (invisível)
    │   └── plus-erp-adapter.ts    ← Adaptador Plus-ERP (para dados de venda)
    │
    ├── contabil/
    │   ├── routes.ts              ← GET/POST /api/soe/contabil/*
    │   ├── rules.ts               ← Regras contábeis
    │   ├── auto-lancamentos.ts    ← Lançamentos automáticos
    │   ├── plano-contas.ts        ← Plano de contas SOE
    │   └── python-adapter.ts      ← Adaptador Motor Python 8003
    │
    ├── financeiro/
    │   ├── routes.ts              ← GET/POST /api/soe/financeiro/*
    │   ├── rules.ts               ← Regras financeiras
    │   ├── previsao.ts            ← Previsão com IA
    │   └── conciliacao.ts         ← Conciliação bancária
    │
    └── shared/
        ├── types.ts               ← Tipos SOE compartilhados
        ├── audit.ts               ← Registro de todas as operações
        └── event-bus.ts           ← Eventos entre Centrais
```

---

## 10. TABELAS DO BANCO A CRIAR (Drizzle ORM)

```typescript
// shared/schema.ts — Adicionar:

// Configuração da empresa no SOE
export const soeEmpresaConfig = pgTable('soe_empresa_config', {
  id: serial('id').primaryKey(),
  empresaId: integer('empresa_id').notNull(),
  regimeTributario: varchar('regime_tributario', { length: 50 }),  // simples, presumido, real
  uf: varchar('uf', { length: 2 }),
  cnpj: varchar('cnpj', { length: 18 }),
  planoContasId: integer('plano_contas_id'),
  configFiscal: jsonb('config_fiscal'),    // alíquotas, CFOPs padrão
  configErp: jsonb('config_erp'),          // qual ERP: plus, erpnext, ambos
  createdAt: timestamp('created_at').defaultNow(),
})

// Regras configuráveis (editáveis pelo usuário)
export const soeRegras = pgTable('soe_regras', {
  id: uuid('id').primaryKey().defaultRandom(),
  empresaId: integer('empresa_id'),        // null = regra global
  dominio: varchar('dominio', { length: 50 }).notNull(), // 'fiscal', 'erp', 'contabil', 'financeiro'
  nome: varchar('nome', { length: 200 }).notNull(),
  trigger: varchar('trigger', { length: 100 }).notNull(),
  condicao: jsonb('condicao').notNull(),
  acao: jsonb('acao').notNull(),
  prioridade: integer('prioridade').default(10),
  ativo: boolean('ativo').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})

// Log de todas as operações SOE (audit trail)
export const soeEventos = pgTable('soe_eventos', {
  id: uuid('id').primaryKey().defaultRandom(),
  empresaId: integer('empresa_id').notNull(),
  dominio: varchar('dominio', { length: 50 }).notNull(),
  tipo: varchar('tipo', { length: 100 }).notNull(),
  regraIds: jsonb('regra_ids'),            // regras aplicadas
  payloadEntrada: jsonb('payload_entrada'),
  payloadSaida: jsonb('payload_saida'),
  erp: varchar('erp', { length: 50 }),    // 'plus', 'erpnext', 'python_8003', etc.
  status: varchar('status', { length: 50 }).notNull(),
  duracao: integer('duracao'),             // ms
  createdAt: timestamp('created_at').defaultNow(),
})

// Lançamentos contábeis centralizados
export const soeLancamentos = pgTable('soe_lancamentos', {
  id: uuid('id').primaryKey().defaultRandom(),
  empresaId: integer('empresa_id').notNull(),
  data: date('data').notNull(),
  contaDebito: varchar('conta_debito', { length: 30 }).notNull(),
  contaCredito: varchar('conta_credito', { length: 30 }).notNull(),
  valor: numeric('valor', { precision: 15, scale: 2 }).notNull(),
  historico: text('historico').notNull(),
  origem: varchar('origem', { length: 100 }),  // 'emissao_nfe', 'pagamento', etc.
  origemId: varchar('origem_id', { length: 100 }),
  period: varchar('period', { length: 7 }),    // '2026-03'
  createdAt: timestamp('created_at').defaultNow(),
})
```

---

## 11. ROADMAP DE IMPLEMENTAÇÃO

### Fase 1 — Fundação (2–3 semanas)
```
[ ] 1. Criar server/soe/ com estrutura básica
[ ] 2. Criar tabelas: soe_empresa_config, soe_regras, soe_eventos, soe_lancamentos
[ ] 3. Implementar Plus Adapter (encapsula chamadas ao Laravel)
[ ] 4. Implementar Frappe Adapter (encapsula chamadas ao ERPNext)
[ ] 5. Endpoint GET /api/soe/status (health check de todos os motores)
[ ] 6. Migrar /api/fisco/* para passar pelo SOE
```

### Fase 2 — Central Fiscal (2–3 semanas)
```
[ ] 7. Implementar Rule Engine para fiscal
[ ] 8. Criar regras fiscais base (NCM, CFOP, tributação por regime)
[ ] 9. POST /api/soe/fiscal/emitir-nfe → Plus (invisível)
[ ] 10. POST /api/soe/fiscal/cancelar-nfe → Plus (invisível)
[ ] 11. GET /api/soe/fiscal/situacao → agrega Plus + Python 8002
[ ] 12. Atualizar frontend /fisco para usar /api/soe/fiscal/*
```

### Fase 3 — Central Contábil (2 semanas)
```
[ ] 13. Implementar auto-lancamentos para eventos fiscais
[ ] 14. Integrar Motor Python 8003 via SOE
[ ] 15. GET /api/soe/contabil/dre → resultado automático
[ ] 16. GET /api/soe/contabil/balancete → atualizado em tempo real
[ ] 17. Atualizar frontend /contabil para usar /api/soe/contabil/*
```

### Fase 4 — Central Financeiro (2 semanas)
```
[ ] 18. Regras de boleto automático (via Asaas)
[ ] 19. Alertas de vencimento (via Manus/WhatsApp)
[ ] 20. Conciliação bancária semi-automática
[ ] 21. Previsão financeira com IA (Motor Python 8003 + Manus)
[ ] 22. Atualizar frontend /financeiro para usar /api/soe/financeiro/*
```

### Fase 5 — Manus + SOE (1 semana)
```
[ ] 23. Registrar novas tools Manus apontando para SOE
[ ] 24. Manus usa SOE para responder perguntas de negócio
[ ] 25. Dashboard SOE: visão geral de todos os eventos
```

### Fase 6 — Central ERP (3 semanas)
```
[ ] 26. Frappe Adapter completo (produtos, pedidos, estoque, compras)
[ ] 27. Regras de negócio ERP no SOE
[ ] 28. Sincronização bidirecional SOE ↔ ERPNext (via eventos)
[ ] 29. Atualizar /erp para usar /api/soe/erp/*
```

---

## 12. RESULTADO FINAL — O QUE O USUÁRIO EXPERIMENTA

```
Antes (fragmentado):
  Usuário → /plus → vê Laravel diretamente
  Usuário → /erp  → vê ERPNext diretamente
  Regras fiscais só no Plus
  Contabilidade manual
  Financeiro sem automação

Depois (SOE Central):
  Usuário → /fisco    → emite NF-e, Plus executa invisível
  Usuário → /contabil → vê DRE gerado automaticamente
  Usuário → /financeiro → vê fluxo, previsões, alertas automáticos
  Usuário → Manus     → pergunta "qual meu resultado?" → resposta completa

  Plus e ERPNext: INVISÍVEIS, executando em background
  Regras: CENTRALIZADAS no SOE, editáveis
  Lançamentos: AUTOMÁTICOS baseados em eventos (NF-e, pagamentos, etc.)
  Auditoria: TOTAL de todas as operações
```

---

## 13. PRINCÍPIO ORIENTADOR

> **"O usuário não sabe o que está por trás. Ele só sabe que funciona."**
>
> O Arcádia Suite é o **Sistema Operacional** da empresa.
> O Plus e o ERPNext são **drivers de hardware** — poderosos, mas invisíveis.
> O SOE Central é o **kernel** que os orquestra com regras e inteligência.

---

*PLANO_SOE_CENTRAL.md — Arcádia Suite v3.0*
*Gerado em: 2026-03-16*
