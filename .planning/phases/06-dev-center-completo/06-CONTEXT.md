# Phase 6 Context — Dev Center Completo

> Generated in --auto mode on 2026-03-26. All decisions auto-selected with recommended defaults.

## Phase Goal

Fábrica completa de agentes integrada ao DevCenter existente: Design → Assemble → Deploy, com galeria de agentes por tenant.

## Prior Context Applied

- **Stack Node.js/TypeScript + React:** sem novos microserviços
- **Backend-first:** tabela + API antes do frontend
- **Blackboard já existe:** `server/blackboard/` com ArchitectAgent, GeneratorAgent, ValidatorAgent, ExecutorAgent — reusar sem modificar
- **DevCenter.tsx já existe em `/dev-center`:** adicionar tabs, não criar nova rota
- **Schema modular:** nova tabela pode ir em `shared/schema.ts` (é a fase certa — tabela de agentes faz parte do core do sistema)
- **Auditoria imutável:** execuções e artefatos já logados via `blackboard_artifacts`

---

## Decisions

### 1. Onde vive a nova UI?

**[auto] 4 novos tabs no DevCenter.tsx existente — sem nova rota**

- Tabs adicionados ao `<TabsList>` existente em `/dev-center`
- Tabs novos: `design`, `assemble`, `deploy`, `galeria`
- Tabs existentes (Desenvolver, Status, Analisar Repos, Ferramentas, Sistema, Preview, Histórico) permanecem intocados
- Nenhuma nova rota no App.tsx, nenhum novo import lazy

### 2. DesignStudio — modos do editor

**[auto] 3 modos: Markdown Spec, Code Editor, Visual Flow**

- **Markdown Spec** (padrão): textarea com Monaco em modo `markdown` — usuário descreve o agente em linguagem natural estruturada
- **Code Editor**: Monaco em modo `typescript` — para specs técnicas detalhadas ou código direto
- **Visual Flow**: lista de nós editáveis (JSON simples) — nome/tipo/conexões — NÃO um editor gráfico completo
- UML = descrito via texto em Markdown Spec (sem biblioteca de diagramas)
- Seletor de modo: 3 botões inline no topo do tab Design

### 3. Tabela de definições de agentes

**[auto] Nova tabela `arcadia_agent_defs` em `shared/schema.ts`**

Campos:
- `id` (serial PK)
- `tenantId` (varchar, nullable)
- `userId` (varchar — criador)
- `name` (varchar — nome do agente)
- `description` (text)
- `spec` (jsonb — conteúdo do DesignStudio: `{ mode, content }`)
- `status` (varchar — `draft | assembling | ready | deployed`)
- `version` (integer, default 1)
- `lastTaskId` (integer — FK para blackboard_tasks, nullable)
- `createdAt`, `updatedAt` (timestamp)

API: `/api/agent-defs` — CRUD padrão (GET list, POST create, PATCH update, DELETE)

### 4. AssembleLine — fluxo de montagem

**[auto] DesignStudio spec → POST /api/blackboard/task → GeneratorAgent → artefato linkado**

- Tab "Assemble" lista `arcadia_agent_defs` com status `draft`
- Botão "Montar" por agente: POST `/api/blackboard/task` com spec como contexto
  - `title`: `"Montar agente: ${name}"`
  - `description`: conteúdo do spec
  - `context`: `{ agentDefId, spec, source: "agent-factory" }`
- Atualiza `arcadia_agent_defs.status` → `assembling`, salva `lastTaskId`
- Progresso: polling de `/api/blackboard/task/:id` a cada 3s
- Ao completar: status → `ready`, artefato gerado visível no painel de detalhes
- Reusar completamente os agentes Blackboard existentes — zero modificação

### 5. OrchestrateCenter — deploy e monitoramento

**[auto] Lista de agent_defs com ações de deploy + viewer de artefatos**

- Tab "Deploy": lista `arcadia_agent_defs` em status `ready` ou `deployed`
- Ação "Deploy": PATCH status → `deployed`, incrementa `version`
- Ação "Re-montar": volta para `draft`, decrementa version (permite iteração)
- Monitoramento: expandir linha → mostra último `blackboard_artifact` do `lastTaskId`
- Versionamento: campo `version` incrementado a cada novo deploy
- Sem infra externa — deploy = mudança de status no banco

### 6. Galeria de agentes

**[auto] Grid de cards por tenant — tab "Galeria"**

- Tab "Galeria": grid de cards com `arcadia_agent_defs` onde `status = "deployed"`
- Cada card: nome, descrição, badge de status, número de versão, criador
- Ação "Executar": POST `/api/blackboard/task` com spec do agente → cria nova task de execução
- Ação "Fork": duplica o agente def como novo draft (copia spec, incrementa nome)
- Filtro por status (todos / somente deployed) e busca por nome
- Empty state: "Nenhum agente implantado — crie um na aba Design"

---

## Reusable Assets Identified

- `server/blackboard/routes.ts` — `POST /api/blackboard/task`, `GET /api/blackboard/task/:id`, `GET /api/blackboard/tasks` — reusar sem modificar
- `server/blackboard/service.ts` — `createMainTask()`, `getTaskWithDetails()` — reusar
- `shared/schema.ts` — `blackboardTasks`, `blackboardArtifacts` — leitura e join
- `client/src/pages/DevCenter.tsx` — estrutura de tabs existente — adicionar sem remover
- `client/src/pages/AutomationCenter.tsx` — referência de UX: lista com filtros + badges
- `client/src/pages/Skills.tsx` — referência de galeria com cards
- Monaco Editor já instalado (usado no DevCenter tab "Desenvolver")

---

## Scope Boundary

**Incluído nesta fase:**
- Tabela `arcadia_agent_defs` + migration + API CRUD `/api/agent-defs`
- Tab "Design" (DesignStudio: 3 modos + Monaco)
- Tab "Assemble" (lista de defs + botão Montar + progresso polling)
- Tab "Deploy" (OrchestrateCenter: lista ready/deployed + ações deploy/re-montar + viewer)
- Tab "Galeria" (grid por tenant + run + fork)
- Backend endpoint `POST /api/agent-defs/:id/deploy` e `POST /api/agent-defs/:id/run`

**Fora de escopo (phases futuras):**
- Editor gráfico visual com React Flow ou similar
- Execução real do código gerado em sandbox (Phase 7)
- Integração com CI/CD ou containers reais
- Sharing de agentes entre tenants

---

## Plan Breakdown Suggested

- **06-01:** `shared/schema.ts` (tabela `arcadia_agent_defs`) + `server/agent-defs/routes.ts` (CRUD + `/deploy` + `/run`) + registro em `server/routes.ts`
- **06-02:** Tab "Design" (DesignStudio 3 modos) + Tab "Assemble" (lista + polling de progresso) no DevCenter.tsx
- **06-03:** Tab "Deploy" (OrchestrateCenter) + Tab "Galeria" (grid + run/fork) no DevCenter.tsx
