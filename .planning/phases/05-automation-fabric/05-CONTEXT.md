# Phase 5 Context — Automation Fabric

> Generated in --auto mode on 2026-03-26. All decisions auto-selected with recommended defaults.

## Phase Goal

Automações unificadas sob runtime único — 5 runtimes tipados substituindo a fragmentação entre XOS (`xos_automations`) e Central (`automations`), com `AutomationCenter.tsx` como visão unificada.

## Prior Context Applied

- **Stack Node.js/TypeScript:** runtimes ficam no servidor Express, sem novos microserviços Python
- **Backend-first:** API definida antes do frontend
- **DB imutável:** tabelas `automations` e `xos_automations` não são alteradas — migração virtual
- **Padrão de phases anteriores:** wrappers leves sobre código existente, sem reescritas

---

## Decisions

### 1. Estratégia de migração

**[auto] Unificação virtual — zero migração de dados**

- Tabelas `automations` e `xos_automations` permanecem intactas
- Nova camada `server/automation-fabric/` agrega os dois via API layer
- `AutomationCenter.tsx` consome endpoint unificado `/api/automation-fabric/list`
- Endpoint retorna rows de ambas as tabelas com campo `source: "central" | "xos"`
- Dados existentes: sem risco de perda, sem downtime, sem migration script

### 2. Os 5 runtimes

**[auto] Classes TypeScript leves — roteamento para serviços existentes**

Implementados em `server/automation-fabric/runtimes/`:

| Runtime | Responsabilidade | Delega para |
|---|---|---|
| `WorkflowEngine` | Executa ações sequenciais com condições | `AutomationService` existente |
| `RuleEngine` | Avalia condições JSONB e dispara ações | Lógica inline, sem dependência |
| `AgentExecutor` | Executa automações via agente Manus | `ManusService` |
| `ScheduleEngine` | Gerencia cron/interval | `scheduledTasks` + setInterval existente |
| `EventEngine` | Webhook/event triggers | Registra listeners no Express |

- `AutomationFabricService` orquestra: dado tipo de trigger → escolhe runtime correto
- Trigger routing: `schedule` → ScheduleEngine, `event`/`webhook` → EventEngine, `agent` → AgentExecutor, default → WorkflowEngine

### 3. Rota do AutomationCenter

**[auto] Nova rota `/automations-center` — existentes intocadas**

- `/automations` (Central) e `/xos/automations` (XOS) permanecem sem alteração
- Nova página `client/src/pages/AutomationCenter.tsx` em `/automations-center`
- Adicionada ao nav/router sem remover rotas existentes

### 4. UI do AutomationCenter

**[auto] Lista unificada com badge de fonte + filtros inline**

- Lista flat com cards: nome, descrição, trigger type, última execução, status ativo/inativo
- Badge colorido: `"Central"` (azul) | `"XOS"` (roxo)
- Filtros: por fonte, por status (ativo/inativo), por trigger type
- Toggle inline enable/disable via PATCH ao respectivo endpoint original
- Execução manual via botão "Executar" → POST `/api/automation-fabric/{id}/run`
- Empty state informativo

---

## Reusable Assets Identified

- `server/automations/service.ts` — `AutomationService.runAutomation()` (reusar no WorkflowEngine)
- `server/automations/routes.ts` — padrão de rota com auth check
- `server/manus/service.ts` — `manusService` para AgentExecutor
- `shared/schema.ts` — `automations`, `xos_automations`, `automationLogs` já existentes
- `client/src/pages/Automations.tsx` — referência de UX/layout para a nova página
- `client/src/pages/XosAutomations.tsx` — referência de cards e filtros

---

## Scope Boundary

**Incluído nesta fase:**
- `server/automation-fabric/` — 5 runtimes + `AutomationFabricService` + rotas unificadas
- `GET /api/automation-fabric/list` — lista unificada (central + xos)
- `POST /api/automation-fabric/:id/run` — execução via fabric
- `AutomationCenter.tsx` — página `/automations-center`

**Fora de escopo (phases futuras):**
- Editor visual de automações (Phase 6 / Dev Center)
- Migração física de dados para tabela unificada
- Novos tipos de trigger não existentes

---

## Plan Breakdown Suggested

- **05-01:** `server/automation-fabric/` — 5 runtimes + `AutomationFabricService` + routes (`/api/automation-fabric`)
- **05-02:** `AutomationCenter.tsx` — página unificada `/automations-center` com lista, filtros e execução inline
