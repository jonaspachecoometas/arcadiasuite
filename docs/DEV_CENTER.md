# Dev Center — Fábrica de Agentes

**Rota:** `/development` → ícone "Design Studio"
**Componente:** `client/src/pages/DevCenter.tsx` (função `AgentFactoryTabs`)
**Backend:** `server/agent-defs/routes.ts` + `server/blackboard/`

---

## Visão Geral

O Dev Center é a fábrica de agentes do Arcádia Suite. Permite criar, montar, implantar e monitorar agentes de IA de forma visual, seguindo o pipeline:

```
Design → Assemble → Deploy → Galeria
```

Cada agente tem um ciclo de vida com 4 status:

| Status | Descrição |
|--------|-----------|
| `draft` | Rascunho criado, aguardando montagem |
| `assembling` | Sendo montado pelo Blackboard |
| `ready` | Montagem concluída, pronto para deploy |
| `deployed` | Implantado e disponível para execução |

---

## Abas

### Design

Cria e edita definições de agentes (`agent_defs`).

- **Editor de spec** — suporta 3 modos: `markdown`, `typescript`, `visual`
- Salva via `PATCH /api/agent-defs/:id`
- Após salvar, agente fica com status `draft` e aparece na aba Assemble

### Assemble (Linha de Montagem)

Lista agentes em `draft` ou `assembling` e aciona a montagem via Blackboard.

- Botão **Montar** → `POST /api/agent-defs/:id/assemble`
  - Cria uma `MainTask` no Blackboard com a spec do agente
  - Cria subtask `architect` para projetar a estrutura
- **Painel de progresso** (expansível por Task ID):
  - Polling a cada 3s em `/api/blackboard/task/:id`
  - Mostra subtasks com ícones de status (✓ ✗ ⏳ ⏰) e `agentRole`
- Quando a task completa → status muda para `ready` (ou `draft` se falhou)

### Deploy (Orchestrate Center)

Gerencia agentes `ready` e `deployed`.

- **Stats** no topo: total de agentes / prontos p/ deploy / implantados
- **Deploy** → `POST /api/agent-defs/:id/deploy` (só para `ready`)
  - Incrementa `version`, muda status para `deployed`
- **Executar** → `POST /api/agent-defs/:id/run` (só para `deployed`)
  - Cria nova task no Blackboard para execução
- **Re-montar** → `POST /api/agent-defs/:id/redraft`
  - Volta para `draft` para corrigir e remontar

### Galeria

Grid de agentes `deployed` com busca por nome/descrição.

- Cada card mostra: nome, descrição, versão
- Botão **Executar** — dispara execução imediata
- Botão **Fork** → `POST /api/agent-defs/:id/fork` — duplica como novo `draft`
- Botão **Info** (ícone) — dialog com spec completo, modo do editor e data de criação

---

## API Reference

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/agent-defs` | Lista todos os agentes do tenant |
| `POST` | `/api/agent-defs` | Cria novo agente (status: draft) |
| `PATCH` | `/api/agent-defs/:id` | Atualiza nome, descrição ou spec |
| `DELETE` | `/api/agent-defs/:id` | Remove agente |
| `POST` | `/api/agent-defs/:id/assemble` | Inicia montagem via Blackboard |
| `POST` | `/api/agent-defs/:id/deploy` | Implanta agente (ready → deployed) |
| `POST` | `/api/agent-defs/:id/run` | Executa agente implantado |
| `POST` | `/api/agent-defs/:id/fork` | Duplica como draft |
| `POST` | `/api/agent-defs/:id/redraft` | Volta para draft |

---

## Schema

Tabela: `arcadia_agent_defs`

```sql
id          serial PRIMARY KEY
tenant_id   varchar
user_id     varchar REFERENCES users(id)
name        varchar(200) NOT NULL
description text
spec        jsonb NOT NULL DEFAULT '{}'   -- { mode, content }
status      varchar(30)  DEFAULT 'draft'
version     integer      DEFAULT 1
last_task_id integer                      -- FK blackboard_tasks
created_at  timestamp
updated_at  timestamp
```

Migration: `migrations/phase6_agent_defs.sql`

---

## Integração com Blackboard

O Assemble usa `blackboardService.createMainTask()` + `createSubtask()`.
A spec do agente é passada como `content` da task, com metadata `{ agentDefId, source: "agent-factory" }`.

Quando a task do Blackboard completa ou falha, o polling no frontend (`useEffect` com `setInterval(3000)`) atualiza o status do agente via `PATCH /api/agent-defs/:id`.
