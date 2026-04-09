# PLANO DE IMPLEMENTAÇÃO: ARCÁDIA AGENTIC SUITE
**Versão:** 1.0 | **Baseado em:** Planejamento Estratégico Arcádia v1.0 (Março 2026)
**Rastreamento:** Ações marcadas com `[DATA | HORA | AUTOR | DETALHE]`

---

## LEGENDA DE STATUS

```
[ ] Pendente
[~] Em andamento
[x] Concluído
[!] Bloqueado / Atenção
[?] Requer decisão antes de executar
```

---

## ALERTAS DE CONFLITO COM SISTEMA EXISTENTE

> Itens marcados com **(CONFLITO POTENCIAL)** podem sobrescrever ou interferir
> com configurações já existentes no Arcádia. CONFIRMAR antes de executar.

| Item | Conflito | Observação |
|------|----------|------------|
| `docker-compose.yml` | **(CONFLITO POTENCIAL)** | Pode já existir com serviços configurados |
| Apache Superset | **(CONFLITO POTENCIAL)** | RLS e dashboards já configurados — nova instância pode perder dados |
| Tabelas `skills`, `automations` | **(CONFLITO POTENCIAL)** | Verificar se já existem no schema atual |
| XOS/Automations | **(CONFLITO POTENCIAL)** | Unificação na Fase 5 altera o runtime existente |
| `/automations` (Central) | **(CONFLITO POTENCIAL)** | Será migrado/substituído na Fase 5 |

---

## FASE 1 — FUNDAÇÃO (Semanas 1-2)
**Entregável:** Infraestrutura base funcionando

### 1.1 Submodules / Clone

- [ ] Clonar MiroFlow como submodule em `server/modules/miroflow/`
  ```bash
  git submodule add https://github.com/MiroMindAI/MiroFlow.git server/modules/miroflow
  ```

- [ ] Clonar OpenClaw como submodule em `server/modules/openclaw/`
  ```bash
  git submodule add https://github.com/miaoxworld/OpenClawInstaller.git server/modules/openclaw
  ```

- [ ] Inicializar submodules
  ```bash
  git submodule update --init --recursive
  ```

### 1.2 Banco de Dados — Novas Tabelas

> **(CONFLITO POTENCIAL)** — Verificar se tabelas já existem antes de criar

- [ ] Criar tabela `skills` no PostgreSQL
- [ ] Criar tabela `automations` no PostgreSQL
- [ ] Criar tabela `skill_executions` no PostgreSQL
- [ ] Criar migration e executar `npm run db:migrate`

### 1.3 Knowledge Graph (Neo4j) — Novos Nós

- [ ] Estender KG com nó: `Skill`
- [ ] Estender KG com nó: `Automation`
- [ ] Estender KG com nó: `Execution`

### 1.4 Reference System

- [ ] Implementar `ReferenceParser` — `server/modules/skills/ReferenceParser.ts`
- [ ] Implementar `ReferenceResolver` — `server/modules/skills/ReferenceResolver.ts`

### 1.5 Docker Compose / Infraestrutura

> **(CONFLITO POTENCIAL)** — `docker-compose.yml` pode já existir.
> Confirmar com João antes de sobrescrever.

- [?] Verificar se `docker-compose.yml` já existe no projeto
- [?] Se existir: mesclar serviços (Neo4j, Ollama, Superset) sem sobrescrever configs atuais
- [ ] Garantir serviços no compose: PostgreSQL, Neo4j, Ollama, Superset, Arcádia Suite

---

## FASE 2 — SKILLS ENGINE (Semanas 3-4)
**Entregável:** Skills criáveis e executáveis

### 2.1 Backend — Skill Engine

- [ ] Implementar `SkillEngine.ts` — `server/modules/skills/SkillEngine.ts`
  - Suporte a herança (`extends`)
  - Suporte a composição (`dependencies`)
  - Suporte a polimorfismo (`execute()`)
- [ ] Implementar `SkillRepository.ts` — CRUD de skills no banco

### 2.2 Sistema de Namespaces

- [ ] Hierarquia: `system` → `tenant` → `company` → `user`
- [ ] Resolver prioridade e herança entre namespaces

### 2.3 Frontend — Editor de Skills

- [ ] Criar componente `SkillEditor.tsx` — `client/src/components/skills/`
  - Modo Visual
  - Modo Code (TypeScript)
  - Modo Markdown
- [ ] Criar `ReferenceParser.ts` no frontend com autocomplete de `/`
- [ ] Criar `SkillMarketplace.tsx` — descoberta de skills disponíveis

### 2.4 Versionamento de Skills

- [ ] Implementar versionamento Git-like para skills (histórico de versões)

---

## FASE 3 — MIROFLOW EMBUTIDO (Semanas 5-6)
**Entregável:** Análises científicas disponíveis

### 3.1 Configuração MiroFlow para Ollama Local

- [ ] Criar `config/arcadia_agents.yaml` em `server/modules/miroflow/config/`
  - `provider: ollama`
  - `base_url: http://localhost:11434`
  - Modelos: `deepseek-r1:32b` (default), `deepseek-r1:70b` (reasoning), `llama3.1:8b` (fast)
- [ ] Instalar dependências Python: `pip install -r requirements.txt`

### 3.2 Agentes Especializados

- [ ] Configurar agente `Arcádia Statistician` (deepseek-r1:32b)
  - Tools: arcadia_sql_query, pandas_analysis, scipy_stats, visualization_generator
- [ ] Configurar agente `Arcádia Fiscal Auditor` (deepseek-r1:70b)
  - Tools: nfe_validator, sped_generator, tax_calculator, risk_scorer
- [ ] Configurar agente `Arcádia Researcher` (llama3.1:70b)
  - Tools: knowledge_graph_query, document_search, trend_analyzer

### 3.3 Bridge Superset → MiroFlow

> **(CONFLITO POTENCIAL)** — Superset já está em produção com RLS configurado.
> A bridge adiciona funcionalidade nova (Modo Científico), não deve quebrar configs existentes.
> Confirmar antes de modificar qualquer arquivo do Superset atual.

- [?] Verificar se a instância atual do Superset suporta custom viz (`BaseViz`)
- [ ] Criar `MiroFlowBridge.ts` — `server/modules/superset/MiroFlowBridge.ts`
- [ ] Criar `miroflow_scientific.py` — viz customizada no Superset
  - Endpoint: `POST /api/miroflow/analyze`
- [ ] Criar `MiroFlowControl.tsx` — toggle "Modo Científico" no frontend
  - `client/src/modules/superset-bridge/MiroFlowControl.tsx`

### 3.4 Integração com Arcádia Audit

- [ ] Garantir que execuções MiroFlow sejam registradas com `immutable_logging: true`
- [ ] Registrar proveniência no Knowledge Graph (dataset versions, analysis lineage, model registry)

### 3.5 Modelos Ollama

- [ ] Baixar modelo: `deepseek-r1:32b`
- [ ] Baixar modelo: `deepseek-r1:70b`
- [ ] Baixar modelo: `llama3.1:8b`
- [ ] Baixar modelo: `llama3.1:70b`

### 3.6 Dev Center — Dashboard de Benchmarks

- [ ] Criar dashboard de benchmarks MiroFlow no Dev Center (GAIA, HLE, FutureX)

---

## FASE 4 — OPENCLAW EMBUTIDO (Semanas 7-8)
**Entregável:** Skills emergentes funcionando

### 4.1 Backend — Pattern Detection

- [ ] Implementar `PatternDetector.ts` — `server/modules/openclaw/PatternDetector.ts`
  - `min_occurrences: 3` | `time_window_days: 30` | `confidence_threshold: 0.8`
- [ ] Implementar `SkillEmergence.ts` — criação de skills emergentes como DRAFT
- [ ] Implementar `OpenClawEngine.ts` — motor de sugestões

### 4.2 Frontend — Widget

- [ ] Criar `OpenClawWidget.tsx` — widget flutuante
  - `client/src/modules/openclaw/OpenClawWidget.tsx`
- [ ] Criar `PatternDetector.ts` frontend — hook de detecção
- [ ] Criar `SkillSuggestion.tsx` — modal de sugestão ao usuário
- [ ] Criar `useAgentEmergence.ts` — lógica de emergência

### 4.3 Configuração OpenClaw Arcádia

- [ ] Criar `config/arcadia.yaml` em `server/modules/openclaw/config/`
  - `tenant_aware: true`
  - `auto_suggest: false` (sempre pedir confirmação)
  - `create_as_draft: true` (requer aprovação)
  - `auto_publish: false`
  - `notify_admins: true`
- [ ] Instalar dependências Node: `cd server/modules/openclaw && npm install`

### 4.4 Fluxo Completo de Emergência

- [ ] Implementar fluxo: Padrão detectado → Skill DRAFT criado → Dev Center para aprovação
- [ ] Integrar com Blackboard para codegen automático da skill emergente
- [ ] Painel de configuração de sugestões por tenant

---

## FASE 5 — AUTOMATION FABRIC (Semanas 9-10)
**Entregável:** Automações unificadas

> **(CONFLITO POTENCIAL)** — Esta fase unifica XOS/Automations e `/automations` Central.
> São sistemas ATIVOS no Arcádia. Migração de dados necessária.
> Confirmar estratégia de migração com João antes de iniciar.

### 5.1 Backend — Runtimes Unificados

- [ ] Implementar `AutomationEngine.ts` — `server/modules/automations/AutomationEngine.ts`
- [ ] Implementar runtime `WorkflowEngine.ts` (BPMN, processos longos, aprovações)
- [ ] Implementar runtime `RuleEngine.ts` (IFTTT simples, rápido)
- [ ] Implementar runtime `AgentExecutor.ts` (Manus/OpenClaw, IA adaptativa)
- [ ] Implementar runtime `ScheduleEngine.ts` (Cron, recorrente)
- [ ] (Opcional) Implementar runtime `EventEngine.ts` (Webhook, real-time)

### 5.2 Modelo Unificado de Automação

- [ ] Definir schema `Automation` com campo `runtime` polimórfico
  - tipos: `workflow | rule | agent | scheduled | event`
- [ ] Implementar `auditHash` para imutabilidade

### 5.3 Migração de Dados

- [ ] Mapear automações existentes em XOS para novo modelo
- [ ] Mapear automações existentes em `/automations` Central para novo modelo
- [ ] Executar migração sem downtime

### 5.4 Frontend — UI Única

- [ ] Criar `AutomationCenter.tsx` — `client/src/modules/automations/AutomationCenter.tsx`
- [ ] Criar `RuleDesigner.tsx` — designer visual de regras
- [ ] Criar `WorkflowDesigner.tsx` — designer BPMN
- [ ] Criar `AgentDesigner.tsx` — designer de agentes IA
- [ ] Criar `AutomationList.tsx` — listagem unificada

### 5.5 Testes

- [ ] Testes de carga nas automações unificadas
- [ ] Testes de segurança (permissões por tenant/company/user)

---

## FASE 6 — DEV CENTER COMPLETO (Semanas 11-12)
**Entregável:** Sistema completo operacional

### 6.1 Design Studio

- [ ] Criar `DesignStudio.tsx` — `client/src/modules/devcenter/DesignStudio.tsx`
  - Modo UML Diagram (classes, herança, relações)
  - Modo Visual Flow (drag-drop nodes)
  - Modo Markdown Spec (linguagem natural)
  - Modo Code Editor (TypeScript + IntelliSense)

### 6.2 Assemble Line

- [ ] Criar `AssembleLine.tsx` — `client/src/modules/devcenter/AssembleLine.tsx`
  - Composition Panel (available skills → selected skills)
  - Flow Diagram automático
  - Botões: Generate Code | Preview | Test | Deploy
- [ ] Integrar com Blackboard (GeneratorAgent, ValidatorAgent, ExecutorAgent)

### 6.3 Orchestrate Center

- [ ] Criar `OrchestrateCenter.tsx` — `client/src/modules/devcenter/OrchestrateCenter.tsx`
  - Deploy de agentes
  - Versionamento
  - Monitoramento de execuções

### 6.4 Galeria de Agentes

- [ ] Criar marketplace interno de agentes (descoberta, instalação por tenant)

### 6.5 Finalização

- [ ] Documentação técnica dos componentes criados
- [ ] Treinamento / onboarding interno
- [ ] `npm run test:miroflow`
- [ ] `npm run test:openclaw`
- [ ] `npm run test:integration`

---

## REGISTRO DE AÇÕES EXECUTADAS

> Formato: `[AAAA-MM-DD | HH:MM | AUTOR | O que foi feito e em qual arquivo/componente]`

| # | Data | Hora | Autor | Ação | Fase |
|---|------|------|-------|------|------|
| 1 | 2026-03-24 | — | João | Adicionado serviço `neo4j` (profile: `kg`) ao `docker-compose.yml` + volumes `neo4j_data` e `neo4j_logs` | Fase 1 |
| 2 | 2026-03-24 | — | João | Adicionado serviço `neo4j` (profile: `kg`) ao `docker-compose.prod.yml` + volumes `neo4j_data` e `neo4j_logs` | Fase 1 |
| 3 | 2026-03-24 | — | João | Adicionadas tabelas `arcadia_skills` (modelo POO) e `skill_executions` ao `shared/schema.ts` — `xosSkillRegistry` preservado | Fase 1 + 2 |
| 4 | 2026-03-24 | — | João | Criada migration `0003_arcadia_skills.sql` — cria tabelas `arcadia_skills` e `skill_executions` com índices | Fase 1 |

---

## DECISÕES ARQUITETURAIS REGISTRADAS

| Componente | Decisão | Status |
|------------|---------|--------|
| MiroFlow | EMBUTIR como submodule em `server/modules/miroflow/` | Pendente |
| OpenClaw | EMBUTIR como submodule em `server/modules/openclaw/` | Pendente |
| Apache Superset | INTEGRAR externamente com bridge MiroFlow | Pendente |
| Skills | Modelo POO (herança, composição, polimorfismo) | Pendente |
| Automações | Unificar XOS + Central em runtime único | Pendente |
| Dev Center | Fábrica: Design → Assemble → Deploy | Pendente |
| Multi-tenant | Hierarquia: System → Tenant → Company → User | Pendente |

---

*Documento gerado em: 2026-03-24 | Baseado no Planejamento Estratégico Arcádia v1.0*
