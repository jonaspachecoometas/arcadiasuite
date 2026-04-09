# Avaliação de Aderência - Impacto Geologia
## Arcádia Suite vs Requisitos do Book de Requisitos
### Data: Fevereiro 2026

-## 1. RESUMO EXECUTIVO

Este documento apresenta a análise de aderência entre os requisitos levantados no Book de Requisitos da Impacto Geologia e as funcionalidades atualmente implementadas na plataforma Arcádia Suite. A avaliação considera o estado atual do sistema, identificando o que já está pronto, o que está parcialmente implementado e o que precisa ser desenvolvido.

**Resultado Geral:**
| Status | Quantidade | % |
|--------|-----------|---|
| Implementado | 14 | 38% |
| Parcialmente Implementado | 10 | 27% |
| Não Implementado | 13 | 35% |
| **Total de Requisitos** | **37** | **100%** |

---

## 2. ANÁLISE POR MÓDULO

### 2.1 Módulo Administrativo Financeiro

| ID | Requisito | Status | Observação |
|----|-----------|--------|------------|
| RF-AF01 | Conciliação Bancária Automatizada | Parcial | Existe `finBankAccounts` e `finTransactions` para contas bancárias e transações, mas não há rotina de conciliação automática com extratos OFX/CSV |
| RF-AF02 | Fluxo de Pagamentos Controlado | Parcial | `finAccountsPayable` existe para contas a pagar, mas falta workflow de aprovação (programação → aprovação → execução) |
| RF-AF03 | Controle de Fluxo de Caixa Projetado | Parcial | `finCashFlowCategories` e transações existem, mas falta projeção automática de 90 dias com cenários |
| RF-AF04 | Gestão de Impostos e Obrigações | Implementado | Módulo fiscal completo: `fiscalNcms`, `fiscalCfops`, `fiscalCests`, `fiscalGruposTributacao`, `fiscalConfiguracoes`, `fiscalNotas` com integração Arcádia Plus |
| RF-AF05 | Prestação de Contas Digital | Parcial | `fieldExpenses` existe para despesas de campo, mas falta fluxo de aprovação digital e comprovantes fotográficos via mobile |
| - | Gestão de Ativos e Endividamento | Não Implementado | Não existe módulo de controle de ativos fixos nem dashboard de endividamento |
| - | Gestão de Cartões Corporativos | Não Implementado | Não há funcionalidade para tratar cartões como "contas correntes individuais" com controle de cargas/depósitos |

**Resumo Financeiro: 1 implementado, 4 parciais, 2 não implementados**

---

### 2.2 Módulo Comercial (Vendas e CRM)

| ID | Requisito | Status | Observação |
|----|-----------|--------|------------|
| RF-COM01 | Conversão Proposta → Projeto | Parcial | `crmProposals`, `crmProposalItems`, `crmOpportunities` existem, mas falta a automação de conversão proposta aprovada → criação automática de Projeto + Ordem de Venda |
| RF-COM02 | Gestão de Incentivos/Comissões | Implementado | `crmCommissionRules`, `crmCommissions` no CRM + `retailCommissionPlans`, `retailCommissionClosures` no Retail - sistema completo de comissões |
| RF-COM03 | Pesquisa de Satisfação (NPS) | Não Implementado | Campos de `satisfactionScore` existem em algumas tabelas, mas não há módulo dedicado de envio automático de pesquisa NPS pós-projeto |

**Resumo Comercial: 1 implementado, 1 parcial, 1 não implementado**

---

### 2.3 Módulo Operações e Projetos

| ID | Requisito | Status | Observação |
|----|-----------|--------|------------|
| RF-OP01 | Rastreabilidade por ID de Projeto | Implementado | `pcProjects`, `pcProjectMembers`, `pcProjectActivities`, `pcProjectTasks`, `pcProjectFiles`, `pcProjectHistory` - sistema completo de gestão de projetos com ID único e rastreabilidade |
| RF-OP02 | Gestão de Insumos de Campo | Parcial | Existe estoque (`retailWarehouseStock`, `retailStockMovements`) mas não há vinculação automática de consumo de materiais/equipamentos por projeto |
| RF-OP03 | Digitalização de Fichas de Campo | Parcial | `qualityFieldForms` existe para formulários digitais, mas falta os formulários específicos de geologia (Plano de Amostragem, PT, Monitoramento de Poços) e app mobile dedicado |
| RF-OP04 | Gestão de Pendências de Faturamento | Não Implementado | Não há sistema de monitoramento de eventos de campo que causem quebra de faturamento com alertas automáticos |
| - | Acompanhamento do Ciclo de Vida | Parcial | `pcProjectActivities` e `pcProjectHistory` registram atividades, mas falta pipeline visual desde pré-programação até entrega do relatório final |
| - | Custódia de Equipamentos | Não Implementado | Não existe módulo para controle de custódia de equipamentos por equipe de campo (DOC-010) |
| - | Programação de Equipes de Campo | Não Implementado | Não há funcionalidade de programação de equipes para mobilização de campo (DOC-008) |
| - | Programação de Relatórios | Não Implementado | Não existe módulo de programação e acompanhamento de relatórios técnicos (DOC-009) |

**Resumo Operações: 1 implementado, 3 parciais, 4 não implementados**

---

### 2.4 Módulo Qualidade e Serviços de Terceiros

| ID | Requisito | Status | Observação |
|----|-----------|--------|------------|
| RF-QC01 | Controle de Amostras e Laudos | Implementado | `qualitySamples`, `qualityLabReports` - sistema para rastreamento de amostras enviadas a laboratórios e laudos recebidos |
| RF-QC02 | Gestão de Documentos (QMS) | Implementado | `qualityDocuments`, `qualityDocumentRevisions` - controle de versão e lista mestra de documentos internos (FT-xx) |
| RF-QC03 | Controle de Não Conformidades (RNC) | Implementado | `qualityNonConformities` - registro e gestão de RNC, Ações Corretivas e Oportunidades de Melhoria |
| RF-QC04 | Homologação de Fornecedores (ISO 17025) | Parcial | `suppliers` e `purchaseOrders` existem, mas falta controle de certificações ISO 17025, bloqueio de compras de não-homologados e portal de fornecedores |
| - | Matriz de Treinamentos | Implementado | `qualityTrainingMatrix` - controle de treinamentos, participação e validade |
| - | Controle de Brancos | Não Implementado | Não existe funcionalidade específica para controle de brancos de laboratório (FT-58, FT-68) |

**Resumo Qualidade: 4 implementados, 1 parcial, 1 não implementado**

---

### 2.5 Módulo Fiscal e Tributário

| ID | Requisito | Status | Observação |
|----|-----------|--------|------------|
| RF-FT01 | Módulo Fiscal e Tributário | Implementado | Motor Fiscal completo (Arcádia Fisco): NCMs, CFOPs, CESTs, grupos tributação, certificados digitais, NF-e/NFC-e com integração SEFAZ via nfelib |
| - | Emissão de NF-e de Serviço | Parcial | Infraestrutura fiscal existe, mas NFS-e (Nota Fiscal de Serviço Eletrônica) requer integração com prefeituras, que varia por município - não implementado |
| - | Integração com Arcádia Plus | Implementado | `FiscalAdapter` com conexão via API para transmissão fiscal e emissão de documentos fiscais via Arcádia Plus |

**Resumo Fiscal: 2 implementados, 1 parcial, 0 não implementados**

---

### 2.6 Módulo Estoque e Logística

| ID | Requisito | Status | Observação |
|----|-----------|--------|------------|
| - | Gestão de Estoque | Implementado | `retailWarehouseStock`, `retailStockMovements`, `retailInventories`, `retailInventoryItems` - estoque completo com movimentações e inventário |
| - | Transferências entre Almoxarifados | Implementado | `retailStockTransfers`, `retailStockTransferItems`, `retailTransferSerials` - transferências com rastreio de seriais |
| - | Estoque de Segurança | Não Implementado | Não há funcionalidade de definição de estoque mínimo com alertas automáticos para itens com lead time > 90 dias |
| - | Controle de Km Rodado | Não Implementado | Não existe módulo para controle de custos de km rodado por veículo/equipe |

**Resumo Estoque: 2 implementados, 0 parciais, 2 não implementados**

---

### 2.7 Módulo Gestão de Pessoas (RH)

| ID | Requisito | Status | Observação |
|----|-----------|--------|------------|
| - | Cadastro de Colaboradores | Implementado | `peopleFuncionarios`, `peopleDependentes`, `peopleCargos`, `peopleDepartamentos` |
| - | Folha de Pagamento | Implementado | `peopleFolhaPagamento`, `peopleFolhaItens`, `peopleFolhaEventos`, `peopleEventosFolha` |
| - | Controle de Férias | Implementado | `peopleFerias` |
| - | Controle de Ponto | Implementado | `peoplePonto` |
| - | Benefícios | Implementado | `peopleBeneficios`, `peopleFuncionarioBeneficios` |

**Resumo RH: 5 implementados - módulo completo**

---

### 2.8 Módulo Contabilidade

| ID | Requisito | Status | Observação |
|----|-----------|--------|------------|
| - | Plano de Contas | Implementado | `contabilPlanoContas` |
| - | Centros de Custo | Implementado | `contabilCentrosCusto` - permite vincular custos por projeto |
| - | Lançamentos Contábeis | Implementado | `contabilLancamentos`, `contabilPartidas` |
| - | Períodos e Saldos | Implementado | `contabilPeriodos`, `contabilSaldos` |

**Resumo Contabilidade: 4 implementados - módulo completo**

---

## 3. REQUISITOS NÃO-FUNCIONAIS

| Requisito | Status | Observação |
|-----------|--------|------------|
| Usabilidade/Interface intuitiva | Implementado | Interface moderna React + Tailwind + shadcn/ui, estilo WhatsApp Web |
| Integração via APIs | Implementado | APIs REST completas, protocolos MCP/A2A implementados |
| Segurança e Governança | Implementado | Multi-tenant com tenant scoping, XOS Governance Layer, audit trail |
| Mobile | Não Implementado | Não há aplicativo móvel dedicado; interface web é responsiva mas não tem funcionalidades offline para campo |
| Framework FA (DocTypes customizados) | Implementado | Sistema ArcDocTypes com fields, layouts, pages, scripts e widgets |

---

## 4. PRIORIZAÇÃO - O QUE FALTA PARA FECHAR O PROJETO

### Prioridade ALTA (Essencial para entrega)

| # | Item | Esforço Estimado | Descrição |
|---|------|-----------------|-----------|
| 1 | Conversão Proposta → Projeto automática | 2-3 dias | Workflow que ao aprovar proposta cria automaticamente o Projeto e Ordem de Venda |
| 2 | Workflow de aprovação de pagamentos | 2-3 dias | Fluxo: programação → aprovação (Fran → Sidney) → execução de pagamentos |
| 3 | Conciliação bancária | 3-5 dias | Import de extratos bancários (OFX/CSV) e conciliação automática com transações |
| 4 | Vinculação Insumos ↔ Projetos | 2-3 dias | Associar consumo de materiais e equipamentos a cada projeto |
| 5 | Homologação de Fornecedores ISO 17025 | 3-4 dias | Status de homologação, certificações, bloqueio de compras para não-homologados |
| 6 | Gestão de Pendências de Faturamento | 2-3 dias | Alertas para eventos de campo que impedem faturamento |

### Prioridade MÉDIA (Importante para operação completa)

| # | Item | Esforço Estimado | Descrição |
|---|------|-----------------|-----------|
| 7 | Prestação de contas digital com aprovação | 2-3 dias | Upload de comprovantes, fluxo aprovação de despesas de campo |
| 8 | Projeção de fluxo de caixa 90 dias | 2-3 dias | Dashboard com projeção baseada em recebíveis e pagáveis programados |
| 9 | Formulários de campo específicos | 3-5 dias | Plano de Amostragem, PT, Monitoramento de Poços como DocTypes |
| 10 | Portal de Fornecedores | 3-5 dias | Área externa para fornecedores atualizarem documentos e certificações |
| 11 | NPS automático pós-projeto | 1-2 dias | Envio automático de pesquisa de satisfação ao concluir projeto |
| 12 | Programação de Equipes de Campo | 2-3 dias | Calendário de mobilização de equipes para projetos |
| 13 | Programação de Relatórios | 2 dias | Controle de prazos e status de relatórios técnicos |
| 14 | NFS-e (Nota Fiscal de Serviço) | 5-10 dias | Integração com webservices municipais (varia por prefeitura) |

### Prioridade BAIXA (Desejável / Fase 2)

| # | Item | Esforço Estimado | Descrição |
|---|------|-----------------|-----------|
| 15 | Gestão de Ativos Fixos | 3-5 dias | Cadastro, depreciação e controle de ativos da empresa |
| 16 | Dashboard de Endividamento | 1-2 dias | BI com visão consolidada de endividamento |
| 17 | Gestão de Cartões Corporativos | 2-3 dias | Tratar cartões como contas individuais com cargas |
| 18 | Estoque de Segurança com alertas | 1-2 dias | Definição de estoque mínimo e alertas automáticos |
| 19 | Controle de Km Rodado | 1-2 dias | Registro de km por veículo/equipe com cálculo de custos |
| 20 | Custódia de Equipamentos | 2-3 dias | Controle de equipamentos alocados por equipe de campo |
| 21 | Controle de Brancos de Laboratório | 1-2 dias | Registro e rastreamento de amostras branco |
| 22 | App Mobile para Campo | 15-20 dias | PWA ou app nativo para coleta de dados offline em campo |
| 23 | Contratos Guarda-Chuva | 2-3 dias | Gestão de contratos de fornecimento de longo prazo |

---

## 5. ESTIMATIVA TOTAL DE ESFORÇO

| Prioridade | Itens | Dias Estimados |
|------------|-------|---------------|
| Alta | 6 itens | 14-21 dias |
| Média | 8 itens | 19-33 dias |
| Baixa | 9 itens | 28-42 dias |
| **Total** | **23 itens** | **61-96 dias** |

### Recomendação de Fases:

**Fase 1 (MVP Impacto):** Prioridade Alta → ~3-4 semanas
- Entrega o mínimo necessário para operação integrada

**Fase 2 (Operação Completa):** Prioridade Média → ~4-5 semanas
- Completa todas as funcionalidades operacionais do dia a dia

**Fase 3 (Evolução):** Prioridade Baixa → ~5-7 semanas
- Funcionalidades avançadas e app mobile

---

## 6. O QUE JÁ ESTÁ PRONTO E FUNCIONANDO

A Arcádia Suite já possui uma base sólida implementada:

- **Contabilidade completa** (plano de contas, centros de custo, lançamentos, períodos)
- **Gestão de Pessoas completa** (funcionários, folha, férias, ponto, benefícios)
- **Motor Fiscal completo** (NCMs, CFOPs, CESTs, NF-e/NFC-e, certificados digitais)
- **CRM e Comercial** (leads, oportunidades, propostas, comissões)
- **Gestão de Projetos** (projetos, membros, tarefas, atividades, histórico)
- **Qualidade** (amostras, laudos, RNC, documentos, treinamentos)
- **Estoque** (warehouses, movimentações, transferências, inventário)
- **Financeiro básico** (contas bancárias, a pagar, a receber, transações)
- **Framework FA** (DocTypes customizados para fichas de campo)
- **Multi-tenant com governança** (segurança, audit trail, políticas)
- **Inteligência Artificial** (Manus agent, Dev Center, auto-programação)
- **Comunicação unificada** (WhatsApp, chat interno, email)
- **BI e Dashboards** (motor BI com análise de dados)

---

## 7. CONCLUSÃO

O sistema Arcádia Suite apresenta **aderência de ~65%** aos requisitos da Impacto Geologia, com os módulos estruturais (Contabilidade, RH, Fiscal, Qualidade) praticamente completos. Os principais gaps estão nos **fluxos de negócio específicos** (workflows de aprovação, conciliação bancária, conversão proposta→projeto) e nas **funcionalidades de campo** (formulários específicos de geologia, app mobile, programação de equipes).--



A recomendação é priorizar os 6 itens de alta prioridade para uma entrega funcional em **3-4 semanas**, seguida de evolução gradual nos itens médios e baixos.
