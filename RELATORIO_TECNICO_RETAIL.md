# Relatório Técnico Completo - Módulo Retail (Arcádia Suite)
## Versão 1.0 - Fevereiro 2026

---

## SUMÁRIO

1. [Visão Geral do Módulo](#1-visão-geral)
2. [Banco de Dados - Schema Completo](#2-banco-de-dados)
3. [Dashboard - Painel Principal](#3-dashboard)
4. [PDV - Ponto de Venda](#4-pdv)
5. [Trade-In - Gestão de Troca](#5-trade-in)
6. [Checklist de Avaliação](#6-checklist)
7. [Ordens de Serviço](#7-ordens-de-serviço)
8. [Devoluções e Trocas](#8-devoluções-e-trocas)
9. [Estoque e Depósitos](#9-estoque-e-depósitos)
10. [Comissões e Metas](#10-comissões-e-metas)
11. [Relatórios](#11-relatórios)
12. [Cadastros](#12-cadastros)
13. [Compras e Aquisições](#13-compras-e-aquisições)
14. [Créditos de Cliente](#14-créditos-de-cliente)
15. [Integração com Plus (Laravel)](#15-integração-plus)
16. [API - Endpoints Completos](#16-api-endpoints)
17. [Segurança e Multi-Tenant](#17-segurança)

---

## 1. VISÃO GERAL

### 1.1 Propósito
O módulo **Arcádia Retail** é o **front-office** da Suite, projetado especificamente para o segmento de **Loja de Celulares e Assistência Técnica**. Ele cobre todo o ciclo operacional: venda de dispositivos, avaliação de trade-in, ordens de serviço, gestão de estoque por IMEI, comissões de vendedores, e fechamento de caixa diário.

### 1.2 Métricas do Módulo

| Métrica | Valor |
|---------|-------|
| **Frontend** | 10.067 linhas (ArcadiaRetail.tsx) |
| **Backend** | 5.218 linhas (routes.ts) |
| **Sync Plus** | 542 linhas (plus-sync.ts) |
| **TradeIn Form** | 988 linhas (TradeInForm.tsx) |
| **Total** | ~16.815 linhas de código |
| **Tabelas no banco** | 40+ tabelas |
| **Endpoints de API** | ~130 endpoints REST |
| **Abas da interface** | 11 abas principais |

### 1.3 Abas da Interface

| # | Aba | Descrição |
|---|-----|-----------|
| 1 | **Dashboard** | Visão geral com KPIs, feed de atividades e alertas |
| 2 | **PDV** | Ponto de Venda com carrinho, pagamento múltiplo e trade-in |
| 3 | **Pessoas** | Cadastro unificado (clientes, fornecedores, técnicos) |
| 4 | **Estoque** | Depósitos, saldos, movimentações, inventários e séries |
| 5 | **Serviços** | Ordens de Serviço (externas e internas) |
| 6 | **Trade-In** | Avaliações de dispositivos usados |
| 7 | **Compras** | Pedidos de compra e recebimento de mercadoria |
| 8 | **Cadastros** | Formas de pagamento, vendedores, planos, promoções, tipos |
| 9 | **Relatórios** | 6 relatórios operacionais + detalhamento de vendas |
| 10 | **Comissões** | Dashboard de comissões, metas e fechamento |
| 11 | **Configuração** | Integração Plus, empresas, sincronização |

---

## 2. BANCO DE DADOS - SCHEMA COMPLETO

### 2.1 Tabelas do Módulo Retail (40 tabelas)

#### Estrutura de Lojas e Depósitos

| Tabela | Campos-chave | Descrição |
|--------|-------------|-----------|
| `retail_stores` | id, tenantId, code, name, storeType (holding/distributor/store), parentStoreId, cnpj, posEnabled, serviceEnabled, leaseEnabled | Lojas e filiais na rede |
| `retail_warehouses` | id, tenantId, storeId, code, name, type (store/central/transit/virtual), isMainWarehouse, isDefault, allowNegativeStock, visibleToAllCompanies | Depósitos por loja ou central |
| `retail_warehouse_stock` | warehouseId, productId, quantity, reservedQuantity, availableQuantity, minStock, maxStock | Saldos por produto/depósito |
| `retail_stock_movements` | warehouseId, productId, movementType (entry/exit/transfer/adjustment/return), operationType, quantity, previousStock, newStock, unitCost | Movimentações detalhadas |
| `retail_stock_transfers` | sourceWarehouseId, destinationWarehouseId, status (pending/in_transit/completed/cancelled) | Transferências entre depósitos |
| `retail_stock_transfer_items` | transferId, productId, requestedQuantity, transferredQuantity, receivedQuantity | Itens da transferência |
| `retail_transfer_serials` | transferItemId, serialId | Séries/IMEIs vinculados |
| `retail_product_serials` | productId, warehouseId, serialNumber, imei, imei2, status (in_stock/reserved/sold/returned/defective/in_transit), acquisitionCost, salePrice | Números de série e IMEI |
| `retail_inventories` | warehouseId, inventoryNumber, type (full/partial/cyclic), status (open/counting/adjusting/completed) | Inventários |
| `retail_inventory_items` | inventoryId, productId, systemQuantity, countedQuantity, difference, adjustmentApplied | Itens do inventário |

#### Dispositivos Móveis

| Tabela | Campos-chave | Descrição |
|--------|-------------|-----------|
| `mobile_devices` | imei, imei2, brand, model, color, storage, ram, condition (new/refurbished/used), purchasePrice, sellingPrice, acquisitionType (trade_in/purchase/consignment), relatedEvaluationId, relatedServiceOrderId, personId, suggestedPrice, profitMargin, status (in_stock/sold/in_service/returned/damaged/leased) | Celulares com IMEI |
| `device_history` | deviceId, imei, eventType (received/transferred/sold/returned/service_in/service_out/leased/purchased), fromLocation, toLocation, referenceType, referenceId | Histórico de movimentação por IMEI |

#### PDV e Vendas

| Tabela | Campos-chave | Descrição |
|--------|-------------|-----------|
| `pos_sessions` | storeId, cashierId, cashierName, openingBalance, closingBalance, totalSales, totalRefunds, netSales, cashPayments, cardPayments, pixPayments, otherPayments, transactionCount, status (open/closed/reconciled) | Sessões de caixa |
| `pos_sales` | saleNumber, saleType (direct_sale/lease_to_own), customerId, customerName, subtotal, discountAmount, discountPercent, tradeInValue, tradeInEvaluationId, totalAmount, paymentMethod (cash/debit/credit/pix/combined), paymentDetails (JSONB), soldBy, plusVendaId, plusSyncStatus, empresaId | Vendas no PDV |
| `pos_sale_items` | saleId, itemType (product/device/accessory/service), itemName, imei, deviceId, quantity, unitPrice, discountAmount, totalPrice | Itens da venda |
| `pos_cash_movements` | sessionId, storeId, type (withdrawal/reinforcement), amount, reason, performedBy, authorizedBy | Sangria e reforço de caixa |

#### Pagamentos e Parcelamento

| Tabela | Campos-chave | Descrição |
|--------|-------------|-----------|
| `payment_plans` | saleId, customerId, totalAmount, downPayment, remainingAmount, numberOfInstallments, installmentAmount, interestRate, firstInstallmentDate, paidInstallments, status (active/completed/defaulted/cancelled) | Planos de parcelamento |
| `payment_plan_installments` | planId, installmentNumber, dueDate, amount, paidAmount, paidDate, paymentMethod, status (pending/paid/overdue/cancelled) | Parcelas do plano |

#### Locação com Opção de Compra

| Tabela | Campos-chave | Descrição |
|--------|-------------|-----------|
| `lease_agreements` | agreementNumber, deviceId, imei, leaseStartDate, leaseEndDate, monthlyPayment, totalLeaseCost, purchaseOptionAvailable, purchasePrice, rentCreditPercent | Contratos de locação |
| `lease_payments` | leaseId, paymentNumber, dueDate, amount, paidAmount, status (pending/paid/overdue) | Pagamentos da locação |

#### Trade-In e Avaliações

| Tabela | Campos-chave | Descrição |
|--------|-------------|-----------|
| `device_evaluations` | imei, brand, model, personId, 19 campos de checklist booleano (cada com campo de notas), batteryHealth, estimatedValue, acquisitionValue, status (pending/analyzing/approved/rejected), linkedServiceOrderId, maintenanceOrderId, creditGenerated, creditId | Avaliações de Trade-In |
| `trade_in_checklist_templates` | name, deviceCategory (smartphone/tablet/laptop/smartwatch), isActive | Templates de checklist customizáveis |
| `trade_in_checklist_items` | templateId, category (visual/funcional/acessorios/documentacao), itemName, evaluationType (condition/boolean/percentage/text), options (JSON), impactOnValue (% impacto), isRequired, displayOrder | Itens do template |
| `trade_in_evaluation_results` | evaluationId, checklistItemId, result, percentValue, notes | Resultados por item |
| `trade_in_transfer_documents` | evaluationId, documentNumber, customerName/CPF/RG/address, deviceBrand/Model/IMEI/IMEI2, agreedValue, customerSignature (Base64), termsAccepted, status (draft/pending_signature/signed/completed) | Documento de transferência de posse |
| `retail_acquisitions` | type (trade_in/purchase/consignment), sourceEvaluationId, sourceServiceOrderId, deviceId, acquisitionCost, repairCost, totalCost, suggestedPrice, finalPrice, status (pending/ready_for_stock/in_stock/sold) | Aquisições processadas |

#### Ordens de Serviço

| Tabela | Campos-chave | Descrição |
|--------|-------------|-----------|
| `service_orders` | orderNumber, deviceId, imei, customerName, serviceType (repair/maintenance/internal_review/diagnostic), origin (customer_request/device_acquisition/warranty), assignedTo, technicianName, partsCost, laborCost, totalCost, isInternal, internalType (revision/cleaning/maintenance/quality_check/trade_in_diagnosis/trade_in_maintenance), sourceEvaluationId, checklistData (JSONB), status (12 estados) | Ordens de Serviço |
| `service_order_items` | serviceOrderId, productId, itemType (part/labor/accessory), itemName, quantity, unitPrice, totalPrice | Peças e serviços da O.S. |
| `service_warranties` | serviceOrderId, deviceId, imei, serviceType, warrantyDays, startDate, endDate, status (active/expired/claimed/voided) | Garantias vinculadas |

#### Devoluções

| Tabela | Campos-chave | Descrição |
|--------|-------------|-----------|
| `return_exchanges` | returnNumber, originalSaleId, returnType (return/exchange), reason, refundAmount, refundMethod, status (pending/approved/rejected/processed) | Devoluções e trocas |
| `return_exchange_items` | returnId, itemName, imei, deviceId, reason, refundAmount | Itens devolvidos |

#### Cadastros e Configurações

| Tabela | Campos-chave | Descrição |
|--------|-------------|-----------|
| `retail_payment_methods` | name, type (cash/debit/credit/pix/boleto/financing), brand (visa/mastercard/elo/amex/hipercard), feePercent, fixedFee, installmentsMax, installmentFees (JSONB), daysToReceive | Formas de pagamento |
| `retail_sellers` | personId, code, name, storeId, commissionPlanId, hireDate, isActive | Vendedores |
| `retail_commission_plans` | name, type (fixed/percent/tiered/per_product), baseValue, basePercent, rules (JSONB) | Planos de comissão |
| `retail_seller_goals` | sellerId, month, year, goalAmount, goalType (sales/units/margin), achievedAmount, achievedPercent, bonus | Metas de vendedor |
| `retail_store_goals` | storeId, month, year, goalAmount, achievedAmount, achievedPercent | Metas da loja |
| `retail_commission_closures` | sellerId, periodType (daily/monthly/custom), periodStart, periodEnd, totalSales, totalReturns, netSales, commissionRate, commissionAmount, bonusAmount, status (open/closed/paid) | Fechamento de comissão |
| `retail_commission_closure_items` | closureId, saleId, returnId, itemType (sale/return), amount, commission | Vendas do fechamento |
| `retail_price_tables` | name, customerType (retail/wholesale/vip/employee), discountPercent, markupPercent, validFrom, validTo | Tabelas de preço |
| `retail_price_table_items` | priceTableId, productId, deviceId, customPrice, discountPercent | Preços por produto |
| `retail_promotions` | name, type (percent_off/fixed_off/buy_x_get_y/bundle), discountValue, discountPercent, applyTo (all/category/product/brand), validFrom, validTo | Promoções |
| `retail_product_types` | name, category (device/accessory/part/service), requiresImei, requiresSerial, ncm, cest, origem, cstIcms, csosn, cfops (4 tipos), alíquotas (ICMS/PIS/COFINS/IPI), aliqIbs, aliqCbs | Tipos com atributos fiscais |
| `retail_activity_feed` | activityType, entityType, entityId, title, description, metadata (JSONB), severity (info/success/warning/error) | Feed de atividades |
| `retail_reports` | name, type (sales/inventory/commissions/financial/custom), query, filters (JSONB), columns (JSONB) | Relatórios customizáveis |

#### Créditos

| Tabela | Campos-chave | Descrição |
|--------|-------------|-----------|
| `customer_credits` | personId, customerName, amount, remainingAmount, origin (trade_in/return/manual/promotion), status (active/used/expired/cancelled), expiresAt | Créditos de cliente |

---

## 3. DASHBOARD - PAINEL PRINCIPAL

### 3.1 KPIs em Tempo Real (5 Cards)

| Card | Fonte de Dados | Cálculo |
|------|---------------|---------|
| **Dispositivos em Estoque** | `mobile_devices` WHERE status = 'in_stock' | COUNT total |
| **Vendas Hoje** | `pos_sales` WHERE DATE(created_at) = hoje AND status = 'completed' | SUM(total_amount) + COUNT |
| **OS Abertas** | `service_orders` WHERE status NOT IN ('completed','cancelled') | COUNT |
| **Trade-In Pendentes** | `device_evaluations` WHERE status = 'pending' | COUNT |
| **Ticket Médio** | Derivado | todaySalesTotal / todaySalesCount |

### 3.2 Componentes do Dashboard

| Componente | Descrição |
|------------|-----------|
| **Últimas Ordens de Serviço** | Lista das 5 O.S. mais recentes com número, dispositivo, cliente, status e valor |
| **Avaliações de Trade-In** | Lista das 5 avaliações mais recentes com IMEI, dispositivo, cliente, condição, valor e status |
| **Produtos com Estoque Baixo** | Alertas de produtos com `stockQty < minStock`, exibidos com badge vermelho |
| **Feed de Atividades** | Timeline em tempo real (atualiza a cada 30s) com ícones por tipo (venda/serviço/avaliação), severidade colorida (info/success/warning/error), indicador de não-lido |

### 3.3 Endpoint do Dashboard Stats

```
GET /api/retail/dashboard-stats
```

**Queries executadas:**
1. COUNT de dispositivos em estoque
2. SUM e COUNT de vendas do dia
3. COUNT de O.S. abertas
4. COUNT de avaliações pendentes

---

## 4. PDV - PONTO DE VENDA

### 4.1 Pré-requisitos para Usar o PDV

1. **Sessão de Caixa ativa** (abertura obrigatória com saldo inicial)
2. **Empresa selecionada** (seletor de empresa na barra superior)
3. **Vendedor selecionado** (obrigatório para registrar vendas)

### 4.2 Layout do PDV (Grid 5 Colunas)

```
┌─────────────────────────────────────────┬───────────────────────┐
│   CATÁLOGO DE ITENS (3 colunas)         │   CARRINHO (2 colunas)│
│                                         │                       │
│   [Dispositivos] [Produtos] [Faturar OS]│   Lista de itens      │
│                                         │   Subtotal            │
│   Busca + Filtro                        │   - Desconto          │
│   Lista de itens disponíveis            │   - Trade-In          │
│   com preço e botão "Adicionar"         │   - Crédito           │
│                                         │   = TOTAL             │
│                                         │                       │
│                                         │   [Trade-In]          │
│                                         │   [FINALIZAR VENDA]   │
└─────────────────────────────────────────┴───────────────────────┘
```

### 4.3 Três Abas de Catálogo

#### 4.3.1 Dispositivos (Celulares)
- **Busca:** IMEI, marca, modelo, cor, armazenamento, preço
- **Filtro:** Somente status "in_stock"
- **Exibição:** Marca + Modelo, Storage | Cor | IMEI, Badge de condição (new/refurbished/used), Badge do depósito, Preço de venda
- **Ação:** Botão "Adicionar" (desabilitado se IMEI já está no carrinho)
- **Tipo no carrinho:** `device` com IMEI vinculado

#### 4.3.2 Produtos (Acessórios, Peças)
- **Busca:** Nome, código, descrição, código de barras, NCM
- **Filtro:** Somente status "active"
- **Exibição:** Nome, Código | Categoria, Badge de estoque (quantidade + unidade), Preço de venda
- **Ação:** Botão "Adicionar" com quantidade editável
- **Tipo no carrinho:** `product`

#### 4.3.3 Faturar O.S. (Ordens de Serviço)
- **Busca:** Número da O.S. ou nome do cliente
- **Filtro:** O.S. com status "ready_pickup" (aguardando faturamento)
- **Exibição:** Número da O.S., Cliente, Marca + Modelo, Descrição, Valor total
- **Ação:** Botão "Faturar" (vincula a O.S. à venda)
- **Tipo no carrinho:** `service` com serviceOrderId vinculado

### 4.4 Carrinho de Compras

| Campo | Descrição |
|-------|-----------|
| **Itens** | Lista com nome, descrição, badge de tipo (Celular/Serviço), preço unitário, botão remover |
| **Subtotal** | Soma de todos os itens |
| **Desconto** | Desconto em R$ ou % (configurável) |
| **Trade-In** | Valor de abatimento de avaliação aprovada |
| **Crédito** | Crédito disponível do cliente (trade-in anterior, devolução) |
| **Total** | Subtotal - Desconto - TradeIn - Crédito |

### 4.5 Ações do PDV

| Botão | Função |
|-------|--------|
| **Sangria** | Retirada de dinheiro do caixa (exige motivo) |
| **Reforço** | Adição de dinheiro ao caixa (exige motivo) |
| **Devolução** | Abre fluxo de devolução/troca |
| **Selecionar Cliente** | Busca/cadastro de pessoa unificada |
| **Limpar** | Remove todos os itens do carrinho |
| **Trade-In** | Inicia avaliação de dispositivo do cliente |
| **Finalizar Venda** | Abre modal de pagamento |

### 4.6 Fluxo de Finalização de Venda

```
1. Usuário clica "Finalizar Venda"
2. Modal de pagamento abre com:
   - Forma de pagamento padrão: Dinheiro (valor total)
   - Opções: Cash, Débito, Crédito, PIX, Combinado
   - Para Crédito: campo de parcelas
   - Para Combinado: múltiplas linhas de pagamento
   - Desconto: campo de % e R$
3. Ao confirmar:
   a. Cria registro em pos_sales
   b. Cria registros em pos_sale_items
   c. Atualiza status dos dispositivos para "sold"
   d. Atualiza estoque dos produtos
   e. Registra no activity_feed
   f. Gera impressão da venda (PDF A4)
   g. Sincroniza com Plus (se configurado)
   h. Limpa o carrinho
```

### 4.7 Impressão da Venda (PDF A4)

A impressão é chamada **ANTES** de limpar o carrinho para preservar os dados:
- Formato: A4 (595 x 842pt)
- Conteúdo: Número da venda, data/hora, dados da empresa, cliente, vendedor, lista de itens (produto, quantidade, unitário, total), subtotal, desconto, trade-in, total, forma de pagamento
- Dispositivos: exibe IMEI
- Produtos: exibe NCM (quando disponível)
- Geração: via `jspdf` no navegador

### 4.8 Formas de Pagamento Suportadas

| Método | Campos |
|--------|--------|
| **Dinheiro (cash)** | Valor |
| **Débito (debit)** | Valor |
| **Crédito (credit)** | Valor + Parcelas |
| **PIX (pix)** | Valor |
| **Combinado (combined)** | Múltiplas linhas (ex: R$ 500 PIX + R$ 300 Crédito 3x) |

---

## 5. TRADE-IN - GESTÃO DE TROCA

### 5.1 Fluxo Completo do Trade-In (4 Etapas)

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  ETAPA 1     │    │  ETAPA 2     │    │  ETAPA 3     │    │  ETAPA 4     │
│  Avaliação   │───>│  Aprovação   │───>│  Revisão     │───>│  Estoque     │
│              │    │              │    │  (O.S. Int.) │    │              │
│ Checklist    │    │ Gera crédito │    │ Manutenção   │    │ Cria device  │
│ IMEI/Cliente │    │ Cria O.S.    │    │ Checklist    │    │ Preço suger. │
│ Valor estim. │    │ Registro     │    │ Peças/custos │    │ Disponível   │
│              │    │ IMEI history │    │              │    │ para venda   │
│ Status:      │    │ Status:      │    │ Status:      │    │ Status:      │
│ pending      │    │ approved     │    │ completed    │    │ in_stock     │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### 5.2 Etapa 1 - Avaliação

Dois modos de criação:

#### Avaliação Rápida (Dialog simples)
- Campos: IMEI, Marca, Modelo, Cor, Cliente, Condição Geral, Valor Estimado
- Uso: avaliação expressa sem checklist detalhado

#### Formulário Completo (TradeInForm - 988 linhas)
- **Dados do Cliente:** Busca por nome/CPF na base de pessoas, cadastro rápido
- **Dados do Dispositivo:** IMEI, Marca, Modelo, Cor, Armazenamento
- **Checklist Completo:** 19 itens de verificação (ver seção 6)
- **Peças Necessárias:** Lista de peças com valores
- **Valor de Avaliação:** Calculado ou manual
- **Assinatura Digital:** Canvas para assinatura do cliente (touchscreen/mouse)
- **Ações:** Salvar, Imprimir PDF, Limpar

### 5.3 Etapa 2 - Aprovação

**Endpoint:** `POST /api/retail/evaluations/:id/approve-and-process`

O que acontece na aprovação:
1. Status da avaliação muda para `approved`
2. **Cria O.S. Interna** (`INT${YYMM}RANDOM`) com:
   - `serviceType: "internal_review"`
   - `isInternal: true`
   - `internalType: "revision"`
   - `sourceEvaluationId: evaluationId`
3. **Registra no IMEI History** (ação: `trade_in_approved`, status: `in_revision`)
4. **Gera Crédito para o Cliente:**
   - Busca pessoa pelo `personId`
   - Cria registro em `customer_credits`
   - Origem: `trade_in`
   - Status: `active`
   - Valor = estimatedValue da avaliação

### 5.4 Etapa 3 - Revisão (O.S. Interna)

A O.S. Interna segue o mesmo fluxo de uma O.S. normal mas com marcação `isInternal = true`:
- Técnico pode preencher checklist de revisão
- Adicionar peças utilizadas (custo de reparo)
- Registrar mão de obra
- Preencher diagnóstico

**Endpoint de finalização:** `POST /api/retail/service-orders/:id/finalize-internal`

### 5.5 Etapa 4 - Entrada no Estoque

Ao finalizar a O.S. Interna:
1. **Cria dispositivo** em `mobile_devices`:
   - `condition: "refurbished"` (ou conforme avaliação)
   - `acquisitionType: "trade_in"`
   - `acquisitionCost: estimatedValue + repairCost`
   - `relatedEvaluationId: evaluationId`
   - `relatedServiceOrderId: serviceOrderId`
   - `suggestedPrice: totalCost * (1 + profitMargin/100)`
   - `profitMargin: margem configurada (padrão 30%)`
   - `status: "in_stock"`
2. **Registra no IMEI History** (ação: `entered_stock`)
3. **Registra no Activity Feed** (tipo: `stock_in`)

### 5.6 Consulta do Fluxo Completo

**Endpoint:** `GET /api/retail/evaluations/:id/full-flow`

Retorna:
```json
{
  "evaluation": { ... },
  "serviceOrder": { ... },
  "device": { ... },
  "history": [ ... ],
  "flowStatus": "in_stock",
  "flowStep": 4,
  "steps": [
    { "step": 1, "name": "Avaliação", "status": "completed" },
    { "step": 2, "name": "Aprovação", "status": "completed" },
    { "step": 3, "name": "Revisão (O.S.)", "status": "completed" },
    { "step": 4, "name": "Estoque", "status": "completed" }
  ]
}
```

### 5.7 Uso do Crédito Trade-In no PDV

Quando o cliente com crédito ativo é selecionado no PDV:
- Um banner azul aparece: "Crédito disponível: R$ X.XXX,XX"
- O operador pode ativar "Usar crédito" como abatimento na compra
- O crédito é deduzido automaticamente do total
- Múltiplos créditos são somados (trade-in + devolução + manual)

---

## 6. CHECKLIST DE AVALIAÇÃO

### 6.1 Checklist Fixo (19 Itens Built-in)

O `deviceEvaluations` possui 19 campos booleanos fixos (cada um com campo de notas/observações):

| # | Campo | Pergunta | Tipo | Impacto |
|---|-------|----------|------|---------|
| 1 | `powerOn` | Aparelho liga corretamente? | Sim/Não | Crítico |
| 2 | `screenIssues` | Avarias, travamentos ou toque fantasma? | Sim/Não | Alto |
| 3 | `screenSpots` | Manchas na tela? | Sim/Não | Médio |
| 4 | `buttonsWorking` | Botões funcionando? | Sim/Não | Médio |
| 5 | `wearMarks` | Marcas de uso? | Sim/Não | Baixo |
| 6 | `wifiWorking` | Wi-Fi funcionando? | Sim/Não | Alto |
| 7 | `simWorking` | Chip funcionando? | Sim/Não | Alto |
| 8 | `mobileDataWorking` | 4G/5G funcionando? | Sim/Não | Alto |
| 9 | `sensorsNfcWorking` | Sensores funcionando / NFC? | Sim/Não | Médio |
| 10 | `biometricWorking` | Face ID / Touch ID funcionando? | Sim/Não | Alto |
| 11 | `microphonesWorking` | Microfones funcionando? | Sim/Não | Alto |
| 12 | `earSpeakerWorking` | Áudio auricular funcionando? | Sim/Não | Médio |
| 13 | `loudspeakerWorking` | Áudio alto-falante funcionando? | Sim/Não | Médio |
| 14 | `chargingPortWorking` | Entrada de carregamento funcionando? | Sim/Não | Alto |
| 15 | `camerasWorking` | Câmeras funcionando / Manchas? | Sim/Não | Alto |
| 16 | `flashWorking` | Flash funcionando? | Sim/Não | Baixo |
| 17 | `hasCharger` | Possui carregador? | Sim/Não | Baixo |
| 18 | `toolsAnalysisOk` | Análise pelo 3uTools OK? | Sim/Não | Alto |
| 19 | `batteryHealth` | Saúde da Bateria | 0-100% | Alto |

Cada campo possui um campo paralelo `*Notes` (texto) para observações adicionais.

### 6.2 Checklist do TradeInForm (Frontend - 19 Itens)

O componente `TradeInForm.tsx` implementa o checklist como array com:
- **ID único** por item
- **Descrição** da verificação
- **Valor:** `"sim"` | `"nao"` | `""` (não avaliado)
- **Observação:** campo de texto livre

```
DEFAULT_CHECKLIST = [
  "Aparelho liga corretamente"
  "Avarias, travamentos ou toque fantasma"
  "Manchas na tela"
  "Botões funcionando"
  "Marcas de uso"
  "Wi-Fi funcionando"
  "Chip funcionando"
  "4G/5G funcionando"
  "Sensores funcionando / NFC"
  "Face ID / Touch ID funcionando"
  "Microfones funcionando"
  "Áudio auricular funcionando"
  "Áudio alto-falante funcionando"
  "Entrada de carregamento funcionando"
  "Câmeras funcionando / Manchas"
  "Flash funcionando"
  "Possui carregador"
  "Análise pelo 3uTools OK"
  "Saúde da Bateria (%)"
]
```

### 6.3 Sistema de Templates Customizáveis

Para além do checklist fixo, existe um sistema de templates:

| Tabela | Função |
|--------|--------|
| `trade_in_checklist_templates` | Templates por categoria (smartphone, tablet, laptop, smartwatch) |
| `trade_in_checklist_items` | Itens do template com: categoria (visual/funcional/acessorios/documentacao), tipo de avaliação (condition/boolean/percentage/text), opções JSON, % de impacto no valor, ordenação |
| `trade_in_evaluation_results` | Resultados vinculados à avaliação e item do checklist |

**Tipos de avaliação:**
- `condition`: opções pré-definidas (ex: "perfeito", "bom", "regular", "ruim")
- `boolean`: sim/não
- `percentage`: valor de 0 a 100
- `text`: texto livre

### 6.4 Checklist na O.S. (Diagnóstico)

As Ordens de Serviço possuem campo `checklistData` (JSONB) que armazena dados de checklist de forma flexível:
- Preenchido pelo técnico durante diagnóstico
- Endpoint: `PUT /api/retail/service-orders/:id/checklist`
- Timestamp de conclusão: `checklistCompletedAt`
- Autor: `checklistCompletedBy`

---

## 7. ORDENS DE SERVIÇO

### 7.1 Tipos de O.S.

| Tipo | serviceType | Origem | Descrição |
|------|------------|--------|-----------|
| **Reparo (cliente)** | `repair` | `customer_request` | Cliente traz dispositivo para conserto |
| **Manutenção** | `maintenance` | `customer_request` | Manutenção preventiva |
| **Diagnóstico** | `diagnostic` | `customer_request` | Apenas diagnóstico/orçamento |
| **Revisão Interna** | `internal_review` | `device_acquisition` | Revisão de dispositivo Trade-In |
| **Garantia** | `repair` | `warranty` | Reparo coberto por garantia |

### 7.2 Fluxo de Status da O.S. (12 Estados)

```
open → diagnosis → quote → pending_approval → approved → in_repair → waiting_parts → quality_check → ready_pickup → completed
                                     ↓                                                        ↓
                                  rejected                                                 cancelled
```

| Status | Descrição |
|--------|-----------|
| `open` | Recém-criada, aguardando atendimento |
| `diagnosis` | Em diagnóstico pelo técnico |
| `quote` | Orçamento elaborado, aguardando aprovação |
| `pending_approval` | Enviado para aprovação do cliente |
| `approved` | Cliente aprovou o orçamento |
| `rejected` | Cliente rejeitou o orçamento |
| `in_repair` | Em reparo ativo |
| `waiting_parts` | Aguardando peças/componentes |
| `quality_check` | Verificação de qualidade pós-reparo |
| `ready_pickup` | Pronto para retirada pelo cliente |
| `completed` | Concluída e entregue |
| `cancelled` | Cancelada |

### 7.3 Campos da O.S.

- **Identificação:** Número (auto-gerado), Loja, Prioridade (low/normal/high/urgent)
- **Dispositivo:** IMEI, Marca, Modelo, deviceId
- **Cliente:** Nome, Telefone, Email, personId (pessoa unificada)
- **Técnico:** Nome, personId do técnico
- **Custos:** Peças (partsCost), Mão de obra (laborCost), Total (totalCost)
- **Datas:** Data esperada, Data real de conclusão
- **Pagamento:** Status (pending/paid/partial)
- **O.S. Interna:** isInternal, internalType, sourceEvaluationId

### 7.4 Itens da O.S.

Cada O.S. pode ter múltiplos itens:
- **Peça (part):** Componente utilizado no reparo
- **Mão de obra (labor):** Serviço técnico
- **Acessório (accessory):** Acessório incluído

### 7.5 Garantias de Serviço

Ao concluir uma O.S., pode-se criar uma garantia vinculada:
- Vincula à O.S. e ao IMEI
- Define prazo em dias (ex: 90 dias)
- Status: active → expired (automático) ou claimed (cliente acionou)
- Consulta de garantia por IMEI: `GET /api/retail/warranties/check/:imei`

### 7.6 Faturamento de O.S. no PDV

Quando uma O.S. está com status `ready_pickup`:
1. Aparece na aba "Faturar O.S." do PDV
2. O operador adiciona ao carrinho como item de serviço
3. A venda é registrada normalmente
4. A O.S. é marcada como `completed`

---

## 8. DEVOLUÇÕES E TROCAS

### 8.1 Fluxo de Devolução

```
1. Operador clica "Devolução" no PDV
2. Busca venda original por número ou cliente
3. Seleciona itens para devolver
4. Define motivo e método de reembolso
5. Verificação de senha do gerente (MANAGER_PASSWORD)
6. Processamento:
   a. Cria registro em return_exchanges
   b. Cria itens em return_exchange_items
   c. Para dispositivos: reverte status do mobile_device para "returned"
   d. Para produtos: ajusta estoque
   e. Gera crédito para o cliente (customer_credits)
   f. Registra no IMEI history (para dispositivos)
   g. Registra no activity feed
```

### 8.2 Tipos

| Tipo | Descrição |
|------|-----------|
| `return` | Devolução pura (reembolso) |
| `exchange` | Troca por outro produto |

### 8.3 Métodos de Reembolso

- Crédito na loja (gera `customer_credits`)
- Dinheiro
- Estorno no cartão
- PIX

### 8.4 Busca de Vendas para Devolução

**Endpoint:** `GET /api/retail/sales-for-return?search=...`

Busca por:
- Número da venda (saleNumber)
- Nome do cliente
- CPF do cliente

Retorna vendas com status "completed" + itens detalhados.

### 8.5 Segurança

A devolução exige **senha do gerente** (`MANAGER_PASSWORD`) para ser processada. Endpoint de verificação: `POST /api/retail/verify-manager-password`.

---

## 9. ESTOQUE E DEPÓSITOS

### 9.1 Tipos de Depósito

| Tipo | Descrição |
|------|-----------|
| `store` | Depósito vinculado a uma loja |
| `central` | Depósito central (distribuição) |
| `transit` | Em trânsito entre depósitos |
| `virtual` | Depósito virtual (ex: consignação) |

### 9.2 Movimentações de Estoque

| Tipo de Movimento | Operação | Descrição |
|-------------------|----------|-----------|
| `entry` | `purchase` | Entrada por compra |
| `entry` | `trade_in` | Entrada por trade-in |
| `entry` | `manual_entry` | Entrada manual |
| `entry` | `devolution` | Entrada por devolução |
| `exit` | `sale` | Saída por venda |
| `transfer_in` | - | Recebimento de transferência |
| `transfer_out` | - | Envio para transferência |
| `adjustment` | `inventory_adjustment` | Ajuste de inventário |
| `return` | - | Retorno (devolução) |

### 9.3 Transferências entre Depósitos

Fluxo: `pending → in_transit → completed`

Cada transferência registra:
- Depósito de origem e destino
- Itens com quantidade solicitada, transferida e recebida
- Números de série/IMEI vinculados
- Responsáveis (solicitante, aprovador, recebedor)

### 9.4 Inventário

Tipos: `full` (completo), `partial` (parcial), `cyclic` (cíclico)

Fluxo: `open → counting → adjusting → completed`

Para cada item do inventário:
- Sistema mostra quantidade no sistema
- Operador informa quantidade contada
- Sistema calcula diferença
- Ao aplicar ajuste: cria movimentação automática

---

## 10. COMISSÕES E METAS

### 10.1 Dashboard de Comissões

O dashboard exibe para cada vendedor:
- Total de vendas no período
- Número de vendas
- Ticket médio
- Comissão calculada
- Meta vs Realizado (progress bar)
- Comparativo entre vendedores

### 10.2 Planos de Comissão

| Tipo | Descrição |
|------|-----------|
| `fixed` | Valor fixo por venda |
| `percent` | Percentual sobre o valor da venda |
| `tiered` | Faixas progressivas (rules JSONB) |
| `per_product` | Comissão específica por produto/categoria |

### 10.3 Metas

- **Por Vendedor:** goalAmount, goalType (sales/units/margin), achievedAmount, achievedPercent, bonus
- **Por Loja:** goalAmount, achievedAmount, achievedPercent

### 10.4 Fechamento de Comissão

O fechamento consolida vendas e devoluções em um período:

```
POST /api/retail/commission-closures/calculate

Input: sellerId, periodStart, periodEnd, commissionRate
Output: {
  totalSales,
  totalReturns (devoluções deduzidas),
  netSales (vendas líquidas),
  salesCount,
  returnsCount,
  commissionAmount,
  items: [ { saleId, amount, commission } ]
}
```

Status do fechamento: `open → closed → paid`

---

## 11. RELATÓRIOS

### 11.1 Relatórios Disponíveis (6 + 1)

| # | Relatório | Endpoint | Descrição |
|---|-----------|----------|-----------|
| 1 | **OS por Status** | `GET /reports/os-by-status` | Quantidade e valor total por status |
| 2 | **OS por Técnico** | `GET /reports/os-by-technician` | Total de O.S., concluídas, em andamento, receita por técnico |
| 3 | **Vendas por Vendedor** | `GET /reports/sales-by-seller` | Total vendas, receita, ticket médio, dias ativos |
| 4 | **Margem por IMEI** | `GET /reports/margin-by-imei` | Custo, venda, margem absoluta e %, status |
| 5 | **Caixa Diário** | `GET /reports/daily-cash` | Fechamento completo do dia |
| 6 | **Giro de Estoque** | `GET /reports/stock-turnover` | Estoque atual, vendas 30d, turnover ratio |
| 7 | **Detalhamento de Vendas** | `GET /sales?detailed=true` | Lista completa com filtros |

### 11.2 Caixa Diário (Detalhamento)

O relatório de caixa diário é o mais completo, executando **4 queries:**

**Query 1 - Resumo:**
- Total de vendas (R$)
- Quantidade de vendas
- Total em dinheiro
- Total em cartão (débito + crédito)
- Total em PIX
- Total combinado

**Query 2 - Movimentações:**
- Total de sangrias
- Total de reforços

**Query 3 - Listagem de Vendas:**
- Cada venda com: número, hora, cliente, vendedor, subtotal, desconto, total, forma de pagamento

**Query 4 - Vendas por Vendedor:**
Para cada vendedor, breakdown completo:

| Coluna | Descrição |
|--------|-----------|
| Vendedor | Nome |
| Vendas | Quantidade |
| Dinheiro | Total em cash |
| Débito | Total em débito |
| Crédito | Total em crédito |
| PIX | Total em PIX |
| Combinado | Total combinado |
| Descontos | Total de descontos concedidos |
| **Total** | **Receita líquida** |

Linha de rodapé com totalizadores gerais.

**Cálculo do Saldo do Caixa:**
```
Saldo = Dinheiro + Reforços - Sangrias
```

---

## 12. CADASTROS

### 12.1 Formas de Pagamento

CRUD completo com campos:
- Nome, Tipo (cash/debit/credit/pix/boleto/financing)
- Bandeira (visa/mastercard/elo/amex/hipercard)
- Taxa (%), Taxa fixa (R$)
- Máximo de parcelas
- Taxas por parcela (JSONB: [{installments, feePercent}])
- Dias para recebimento

### 12.2 Vendedores

CRUD com vínculo a:
- Pessoa unificada (personId)
- Loja (storeId)
- Plano de comissão (commissionPlanId)
- Data de contratação

### 12.3 Planos de Comissão

Tipos: fixed, percent, tiered, per_product
Regras customizáveis via JSONB

### 12.4 Tabelas de Preço

- Tipos de cliente: retail, wholesale, vip, employee
- Desconto ou markup percentual
- Validade (de/até)
- Itens específicos com preço customizado

### 12.5 Promoções

- Tipos: percent_off, fixed_off, buy_x_get_y, bundle
- Aplicação: all, category, product, brand
- Quantidade mínima/máxima
- Período de validade

### 12.6 Tipos de Produto

Com atributos fiscais completos:
- Categoria: device, accessory, part, service
- Controle: requiresImei, requiresSerial
- Fiscal: NCM, CEST, Origem, CST ICMS, CSOSN, CFOPs (4 tipos), Alíquotas (ICMS, PIS, COFINS, IPI)
- Reforma Tributária: IBS e CBS (preparado)
- Unidade de medida

---

## 13. COMPRAS E AQUISIÇÕES

### 13.1 Pedidos de Compra

Fluxo: `draft → submitted → approved → partially_received → received → cancelled`

Campos: fornecedor, depósito destino, itens (produto, quantidade, preço), condições de pagamento, frete, desconto, totais.

### 13.2 Recebimento de Mercadoria

**Endpoint:** `POST /api/retail/purchase-orders/:id/receive`

Ao receber:
1. Atualiza quantidades recebidas por item
2. Cria movimentações de estoque (entry/purchase)
3. Atualiza saldos no depósito destino
4. Registra números de série quando aplicável
5. Atualiza status do pedido

---

## 14. CRÉDITOS DE CLIENTE

### 14.1 Origens de Crédito

| Origem | Quando é gerado |
|--------|----------------|
| `trade_in` | Aprovação de avaliação de Trade-In |
| `return` | Devolução com reembolso em crédito |
| `manual` | Criação manual pelo operador |
| `promotion` | Promoção que gera crédito |

### 14.2 Ciclo de Vida

```
active → used (parcial ou total) → expired → cancelled
```

### 14.3 Uso no PDV

Quando o cliente é selecionado:
1. Sistema busca `customer_credits` com status `active` e `remainingAmount > 0`
2. Soma total de créditos disponíveis
3. Exibe banner: "Crédito disponível: R$ X.XXX,XX"
4. Operador pode ativar abatimento
5. Na finalização, deduz do crédito mais antigo primeiro (FIFO)
6. Registra uso parcial (atualiza remainingAmount) ou total (status → used)

### 14.4 Recibo de Crédito

**Endpoint:** `GET /api/retail/customer-credits/:creditId/receipt`

Gera dados para impressão do comprovante de crédito.

---

## 15. INTEGRAÇÃO COM PLUS (LARAVEL)

### 15.1 Componentes da Integração

| Arquivo | Função |
|---------|--------|
| `server/plus/proxy.ts` | Proxy reverso `/plus/*` → Laravel :8080 |
| `server/plus/sso.ts` | SSO via token HMAC-SHA256 |
| `server/plus/launcher.ts` | Auto-start do Laravel (php artisan serve) |
| `server/plus/client.ts` | Cliente REST para API do Plus |
| `server/retail/plus-sync.ts` | Sincronização Retail → Plus |

### 15.2 Sincronização Retail → Plus

| Entidade Suite | Entidade Plus | Endpoint |
|---------------|--------------|----------|
| Persons (clientes) | Clientes | `POST /api/retail/plus/sync/customers` |
| POS Sales + Items | Vendas + Itens + Faturamento | `POST /api/retail/plus/sync/sales` |
| POS Sales | NF-e/NFC-e | `POST /api/retail/plus/sync/nfe` |

### 15.3 Campos de Sync na pos_sales

| Campo | Descrição |
|-------|-----------|
| `plusVendaId` | ID da venda criada no Plus |
| `plusNfeChave` | Chave de acesso da NF-e emitida |
| `plusSyncStatus` | pending → synced → error → not_applicable |
| `plusSyncError` | Mensagem de erro (se houver) |
| `plusSyncedAt` | Timestamp da sincronização |
| `empresaId` | ID da empresa (tenant_empresas) vinculada |

---

## 16. API - ENDPOINTS COMPLETOS

### 16.1 Listagem por Domínio

Todos os endpoints estão sob `/api/retail/*` e requerem autenticação.

#### Activity Feed (2)
```
GET  /activity-feed
POST /activity-feed/mark-read
```

#### Formas de Pagamento (4)
```
GET    /payment-methods
POST   /payment-methods
PUT    /payment-methods/:id
DELETE /payment-methods/:id
```

#### Vendedores (4)
```
GET    /sellers
POST   /sellers
PUT    /sellers/:id
DELETE /sellers/:id
```

#### Planos de Comissão (4)
```
GET    /commission-plans
POST   /commission-plans
PUT    /commission-plans/:id
DELETE /commission-plans/:id
```

#### Tabelas de Preço (4)
```
GET    /price-tables
POST   /price-tables
PUT    /price-tables/:id
DELETE /price-tables/:id
```

#### Promoções (4)
```
GET    /promotions
POST   /promotions
PUT    /promotions/:id
DELETE /promotions/:id
```

#### Tipos de Produto (5)
```
GET    /product-types
GET    /product-types/:id
POST   /product-types
PUT    /product-types/:id
DELETE /product-types/:id
```

#### Lojas (3)
```
GET  /stores
POST /stores
PUT  /stores/:id
```

#### Depósitos (4)
```
GET    /warehouses
POST   /warehouses
PUT    /warehouses/:id
DELETE /warehouses/:id
```

#### Saldos de Estoque (2)
```
GET /warehouse-stock
GET /warehouse-stock/:warehouseId/summary
```

#### Movimentações de Estoque (2)
```
GET  /stock-movements
POST /stock-movements
```

#### Números de Série (3)
```
GET  /product-serials
POST /product-serials
PUT  /product-serials/:id
```

#### Transferências (4)
```
GET  /stock-transfers
GET  /stock-transfers/:id
POST /stock-transfers
PUT  /stock-transfers/:id/status
```

#### Inventários (5)
```
GET  /inventories
POST /inventories
GET  /inventories/:id
PUT  /inventories/:id/count
PUT  /inventories/:id/apply
```

#### Dispositivos (5)
```
GET  /devices
GET  /devices/:id
GET  /devices/imei/:imei
POST /devices
PUT  /devices/:id
```

#### Avaliações / Trade-In (10)
```
GET  /evaluations
GET  /evaluations/:id
POST /evaluations
PUT  /evaluations/:id
PUT  /evaluations/:id/approve
PUT  /evaluations/:id/reject
PUT  /evaluations/:id/start-analysis
POST /evaluations/:id/approve-and-process
GET  /evaluations/:id/full-flow
GET  /evaluations/:id/service-order
```

#### Ordens de Serviço (8)
```
GET    /service-orders
GET    /service-orders/:id
POST   /service-orders
PUT    /service-orders/:id
PUT    /service-orders/:id/complete-preparation
POST   /service-orders/:id/items
GET    /service-orders/:id/items
DELETE /service-orders/:id/items/:itemId
PUT    /service-orders/:id/checklist
POST   /service-orders/:id/finalize-internal
```

#### Sessões de Caixa (3)
```
GET  /pos-sessions
POST /pos-sessions/open
PUT  /pos-sessions/:id/close
```

#### Movimentações de Caixa (2)
```
GET  /cash-movements
POST /cash-movements
```

#### Garantias (4)
```
GET  /warranties
POST /warranties
GET  /warranties/check/:imei
PUT  /warranties/:id/claim
```

#### Alertas de Estoque (1)
```
GET /stock-alerts
```

#### Relatórios (7)
```
GET /reports/os-by-status
GET /reports/os-by-technician
GET /reports/sales-by-seller
GET /reports/margin-by-imei
GET /reports/daily-cash
GET /reports/stock-turnover
GET /dashboard-stats
```

#### Vendas (1)
```
GET /sales
```

#### Pessoas (7)
```
GET    /persons
GET    /persons/:id
POST   /persons
PUT    /persons/:id
POST   /persons/:id/roles
PUT    /persons/:id/roles/:roleId
DELETE /persons/:id/roles/:roleType
```

#### Histórico por Pessoa (4)
```
GET /persons/:id/sales
GET /persons/:id/services
GET /persons/:id/trade-ins
GET /persons/:id/credits
```

#### Histórico por IMEI (3)
```
GET /devices/:imei/history
GET /devices/by-origin/:originType
GET /inventory/by-origin
```

#### Trade-In Workflow (2)
```
GET /customer-trade-ins/:personId
```

#### Segurança (1)
```
POST /verify-manager-password
```

#### Devoluções (5)
```
GET  /sales-for-return
GET  /returns
POST /returns
GET  /customer-credits/:personId
GET  /customer-credits/:creditId/receipt
POST /customer-credits/:creditId/use
```

#### Metas de Vendedor (4)
```
GET    /seller-goals
POST   /seller-goals
PUT    /seller-goals/:id
DELETE /seller-goals/:id
```

#### Metas da Loja (3)
```
GET  /store-goals
POST /store-goals
PUT  /store-goals/:id
```

#### Fechamento de Comissão (4)
```
GET  /commission-closures
POST /commission-closures
PUT  /commission-closures/:id
POST /commission-closures/calculate
GET  /commission-dashboard
```

#### Compras (5)
```
GET    /purchase-orders
GET    /purchase-orders/:id
POST   /purchase-orders
PATCH  /purchase-orders/:id/status
POST   /purchase-orders/:id/receive
DELETE /purchase-orders/:id
```

#### Plus Sync (8)
```
GET  /plus/status
POST /plus/sync/customers
POST /plus/sync/sales
POST /plus/sync/nfe
POST /plus/import/customers
POST /plus/import/products
GET  /plus/empresas
POST /plus/empresas
POST /plus/empresas/:id/bind
```

#### ERPNext Sync (8)
```
GET  /sync/status
POST /sync/persons/:id
POST /sync/persons
POST /sync/devices/:id
POST /sync/service-orders/:id
POST /sync/import/customers
POST /sync/import/suppliers
POST /sync/full
POST /sync/stock-entry
POST /sync/sales-invoice
```

**Total: ~130 endpoints**

---

## 17. SEGURANÇA E MULTI-TENANT

### 17.1 Autenticação
- Todas as rotas exigem `requireAuth` (Passport.js session)
- Verificação: `req.isAuthenticated()`

### 17.2 Tenant Scoping
- Todos os relatórios e consultas filtram por `tenantId`
- Se `tenantId` estiver ausente, retorna 403
- Dados de um tenant nunca vazam para outro

### 17.3 Module Gating
- Middleware `requireModule(key)` verifica se módulo está ativo no tenant
- Verifica campo JSONB `tenants.features[key]`
- Retorna 403 com ação sugerida se módulo inativo

### 17.4 Operações Sensíveis
- Devoluções exigem senha do gerente (MANAGER_PASSWORD)
- Verificação via endpoint dedicado
- Sangrias de caixa registram responsável e autorizador

### 17.5 Auditoria
- Todas as operações relevantes registram no `retail_activity_feed`
- IMEI history rastreia toda movimentação de dispositivos
- Device history registra eventos por IMEI

---

## CONCLUSÃO

O módulo Retail da Arcádia Suite é uma solução completa e verticalmente integrada para lojas de celulares e assistência técnica, com **~16.800 linhas de código**, **40+ tabelas**, e **~130 endpoints REST**. Ele cobre todo o ciclo operacional desde a aquisição de dispositivos (compra ou trade-in), passando pela gestão de estoque por IMEI, ordens de serviço com checklist detalhado, PDV com múltiplas formas de pagamento, até o fechamento de caixa com breakdown por vendedor e tipo de pagamento. A integração com o Plus (Laravel) permite emissão de NF-e/NFC-e e sincronização completa de dados fiscais.
