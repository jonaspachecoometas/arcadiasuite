# Arcádia Automações — Mapa Completo do Motor de Automação

> Mapa da arquitetura de automações da Arcádia Suite: Automation Engine
> (FastAPI :8005), Scheduler (Cron), Event Bus (Pub/Sub), Workflow
> Executor (multi-step), Service Node.js (fallback), XOS Automations
> (CRM), BPMN Viewer, e integração com Manus IA.
> Atualizado em: Março 2026

---

## 1. Visão Geral

O sistema de automações opera em **duas camadas** coordenadas: um motor Python (FastAPI) que executa workflows complexos com scheduler e event bus, e um serviço Node.js que gerencia o CRUD das automações e funciona como fallback de agendamento.

```
┌─────────────────────────────────────────────────────────────────────┐
│                   ARCÁDIA AUTOMAÇÕES — STACK COMPLETO                │
│                                                                      │
│  ┌─────────── Frontend ──────────────────────────────────────┐      │
│  │                                                            │      │
│  │  Automations.tsx    XosAutomations.tsx    WorkflowBuilder   │      │
│  │  (559 linhas)       (350 linhas)          (493 linhas)     │      │
│  │  CRUD + Trigger     CRM workflows         Visual editor   │      │
│  │                                                            │      │
│  │  BpmnPage.tsx       BpmnDiagram.tsx       ProcessDiagram   │      │
│  │  (12 linhas)        (645 linhas)          (184 linhas)     │      │
│  │  BPMN viewer        Diagrama visual       Fluxos visuais  │      │
│  └────────────────────────┬───────────────────────────────────┘      │
│                            │                                         │
│  ┌─────────── Gateway (Node.js :5000) ───────────────────────┐      │
│  │                            │                               │      │
│  │  /api/automations/*   ←───┤   CRUD + Execução (Drizzle)   │      │
│  │  (routes.ts — 343L)       │                               │      │
│  │                            │                               │      │
│  │  /api/automation-engine/* ←┤   Proxy → FastAPI :8005      │      │
│  │  (engine-proxy.ts — 267L) │                               │      │
│  │                            │                               │      │
│  │  AutomationService        ←┤   Executor + Scheduler Node  │      │
│  │  (service.ts — 209L)      │   (polling 60s fallback)      │      │
│  └────────────────────────┬───────────────────────────────────┘      │
│                            │                                         │
│  ┌─────────── Motor Python (FastAPI :8005) ──────────────────┐      │
│  │                            │                               │      │
│  │  automation_engine.py (668 linhas)                        │      │
│  │                                                            │      │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐        │      │
│  │  │ Scheduler│  │Event Bus │  │Workflow Executor  │        │      │
│  │  │ (Cron)   │  │(Pub/Sub) │  │(Multi-step)      │        │      │
│  │  │          │  │          │  │                   │        │      │
│  │  │ Entries  │  │ Subscribe│  │ Condition         │        │      │
│  │  │ Start/   │  │ Emit     │  │ Action            │        │      │
│  │  │ Stop     │  │ History  │  │ Delay             │        │      │
│  │  │ 30s loop │  │ 500 max  │  │ SQL Query         │        │      │
│  │  │          │  │          │  │ HTTP Request      │        │      │
│  │  │          │  │          │  │ Transform         │        │      │
│  │  │          │  │          │  │ Notify            │        │      │
│  │  └──────────┘  └──────────┘  └──────────────────┘        │      │
│  └───────────────────────────────────────────────────────────┘      │
│                                                                      │
│  ┌─────────── PostgreSQL ────────────────────────────────────┐      │
│  │  automations, automation_actions, automation_logs,        │      │
│  │  scheduled_tasks, xos_automations                         │      │
│  └───────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Automation Engine (Python FastAPI — :8005)

O motor Python é o coração do sistema de automações. Roda como processo separado e expõe 3 subsistemas via REST:

### 2.1 — Event Bus (Barramento de Eventos)

```
┌──────────────────────────────────────────────────────────────────┐
│  EventBus — Pub/Sub em memória                                    │
│  server/python/automation_engine.py:117                           │
│                                                                   │
│  ┌─── Tipos de Eventos (EventType) ──────────────────────┐      │
│  │                                                        │      │
│  │  record.created      → Registro criado no banco       │      │
│  │  record.updated      → Registro atualizado            │      │
│  │  record.deleted      → Registro deletado              │      │
│  │  schedule.fired      → Scheduler disparou cron        │      │
│  │  webhook.received    → Webhook externo recebido       │      │
│  │  threshold.reached   → Limiar atingido                │      │
│  │  agent.completed     → Manus IA finalizou tarefa      │      │
│  │  manual.trigger      → Disparo manual do usuário      │      │
│  │  system.event        → Evento interno do sistema      │      │
│  │                                                        │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                   │
│  ┌─── Operações ─────────────────────────────────────────┐      │
│  │                                                        │      │
│  │  subscribe(event_type, handler_id, config)            │      │
│  │  → Registra um handler para um tipo de evento         │      │
│  │                                                        │      │
│  │  unsubscribe(event_type, handler_id)                  │      │
│  │  → Remove assinatura                                  │      │
│  │                                                        │      │
│  │  emit(event_type, payload)                            │      │
│  │  → Emite evento, retorna handlers triggerados          │      │
│  │  → Suporta wildcard "*" (ouve tudo)                   │      │
│  │                                                        │      │
│  │  get_history(limit, event_type)                       │      │
│  │  → Últimos eventos (máx. 500 em memória)              │      │
│  │                                                        │      │
│  │  stats()                                               │      │
│  │  → total_event_types, total_subscribers,               │      │
│  │    history_size, event_types list                       │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                   │
│  Fluxo:                                                           │
│                                                                   │
│  Emissor ──emit("record.created", {entity: "lead"})──▶ EventBus  │
│                                                           │       │
│                          ┌────────────────────────────────┤       │
│                          ▼                                ▼       │
│                    Handler A                         Handler B    │
│                  (workflow X)                       (notificação) │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 — Scheduler (Agendador Cron)

```
┌──────────────────────────────────────────────────────────────────┐
│  Scheduler — Cron-based scheduler                                 │
│  server/python/automation_engine.py:186                           │
│                                                                   │
│  ┌─── CronExpression Parser ─────────────────────────────┐      │
│  │                                                        │      │
│  │  Formato: "minuto hora dia mês dia_semana"            │      │
│  │  Suporta: *, ranges (1-5), steps (*/5), lists (1,3,5) │      │
│  │                                                        │      │
│  │  Exemplos:                                             │      │
│  │  "0 9 * * 1-5"    → Seg-Sex às 9h                    │      │
│  │  "*/15 * * * *"   → A cada 15 minutos                │      │
│  │  "0 0 1 * *"      → 1º dia de cada mês à meia-noite  │      │
│  │                                                        │      │
│  │  matches(datetime) → bool                              │      │
│  │  next_run(from_dt) → datetime                          │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                   │
│  ┌─── SchedulerEntry ────────────────────────────────────┐      │
│  │                                                        │      │
│  │  id:             Identificador único                   │      │
│  │  name:           Nome descritivo                       │      │
│  │  cron:           Expressão cron (5 partes)             │      │
│  │  automation_id:  Link para automação (opcional)        │      │
│  │  action:         "trigger" (padrão)                    │      │
│  │  config:         Configurações extras (JSON)           │      │
│  │  is_active:      Ativo/Inativo                        │      │
│  │  last_run:       Última execução (ISO)                 │      │
│  │  next_run:       Próxima execução (ISO)                │      │
│  │  run_count:      Contador de execuções                 │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                   │
│  ┌─── Loop de Execução ──────────────────────────────────┐      │
│  │                                                        │      │
│  │  Thread daemon, check_interval = 30 segundos          │      │
│  │                                                        │      │
│  │  A cada 30s:                                          │      │
│  │  1. Varre todas as entries ativas                     │      │
│  │  2. Para cada entry: cron.matches(agora)?             │      │
│  │  3. Se match:                                         │      │
│  │     a. Atualiza last_run, run_count                   │      │
│  │     b. Calcula next_run                               │      │
│  │     c. event_bus.emit("schedule.fired", {             │      │
│  │          scheduler_id, automation_id, name             │      │
│  │        })                                              │      │
│  │  4. Sleep(30s)                                        │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                   │
│  Inicia automaticamente no startup do FastAPI                     │
└──────────────────────────────────────────────────────────────────┘
```

### 2.3 — Workflow Executor (Executor Multi-Step)

```
┌──────────────────────────────────────────────────────────────────┐
│  WorkflowExecutor                                                 │
│  server/python/automation_engine.py:273                           │
│                                                                   │
│  ┌─── WorkflowDefinition ────────────────────────────────┐      │
│  │                                                        │      │
│  │  id:         Identificador do workflow                 │      │
│  │  name:       Nome descritivo                           │      │
│  │  steps:      Lista de WorkflowStep                     │      │
│  │  trigger:    Tipo de trigger (opcional)                 │      │
│  │  variables:  Variáveis iniciais (Dict)                 │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                   │
│  ┌─── WorkflowStep ─────────────────────────────────────┐       │
│  │                                                        │      │
│  │  id:         Identificador do step                     │      │
│  │  type:       Tipo (ver abaixo)                         │      │
│  │  config:     Configuração do step (Dict)               │      │
│  │  on_success: Próximo step se OK (opcional)              │      │
│  │  on_failure: Próximo step se falha (opcional)           │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                   │
│  ┌─── Tipos de Steps (WorkflowStepType) ─────────────────┐      │
│  │                                                        │      │
│  │  condition   → Avalia condição (field, operator, value)│      │
│  │               Operadores: ==, !=, >, <, >=, <=,       │      │
│  │               contains, exists                         │      │
│  │                                                        │      │
│  │  action      → Executa ação:                           │      │
│  │               • log (registra mensagem)                │      │
│  │               • set_variable (define variável)         │      │
│  │               • emit_event (emite evento no bus)       │      │
│  │                                                        │      │
│  │  delay       → Pausa execução (max 30s)                │      │
│  │                                                        │      │
│  │  query       → Executa SELECT no PostgreSQL            │      │
│  │               Conexão read-only, timeout 10s,          │      │
│  │               limite 100 rows                          │      │
│  │                                                        │      │
│  │  http        → Requisição HTTP (GET/POST/PUT/DELETE)   │      │
│  │               Timeout 10s, resposta truncada em 5KB    │      │
│  │                                                        │      │
│  │  transform   → Transforma dados:                       │      │
│  │               • count (conta itens)                    │      │
│  │               • sum (soma campo numérico)              │      │
│  │               • filter (filtra por campo/valor)        │      │
│  │                                                        │      │
│  │  notify      → Envia notificação (message + channel)   │      │
│  │                                                        │      │
│  │  loop        → Iteração (planejado)                    │      │
│  │  parallel    → Execução paralela (planejado)           │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                   │
│  ┌─── Fluxo de Execução ────────────────────────────────┐       │
│  │                                                        │      │
│  │  1. Recebe workflow_id + trigger_data + variables     │      │
│  │  2. Cria execution com status "running"               │      │
│  │  3. Merge: workflow.variables + variables + trigger   │      │
│  │  4. Para cada step (sequencial):                      │      │
│  │     a. Executa _execute_step(step, variables)         │      │
│  │     b. Se resultado tem "output" → merge em variables │      │
│  │     c. Registra resultado do step                     │      │
│  │  5. Status final: "completed" ou "error"              │      │
│  │  6. Guarda em memória (máx. 200 execuções)            │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                   │
│  Segurança:                                                       │
│  • SQL: somente SELECT, read-only connection, timeout 10s        │
│  • HTTP: timeout 10s, resposta truncada                          │
│  • Delay: máximo 30 segundos                                     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Automation Service (Node.js — Fallback)

O serviço Node.js complementa o motor Python, fornecendo CRUD das automações e um scheduler de fallback:

```
┌──────────────────────────────────────────────────────────────────┐
│  AutomationService                                                │
│  server/automations/service.ts (209 linhas)                       │
│                                                                   │
│  ┌─── Executor de Ações (Node.js) ──────────────────────┐      │
│  │                                                        │      │
│  │  runAutomation(automationId, userId, triggerData)      │      │
│  │                                                        │      │
│  │  1. Cria log com status "running"                     │      │
│  │  2. Busca automation + actions (orderBy orderIndex)   │      │
│  │  3. Executa cada action sequencialmente:              │      │
│  │                                                        │      │
│  │  Tipos de ação suportados:                            │      │
│  │                                                        │      │
│  │  ┌────────────────────────────────────────────┐       │      │
│  │  │ agent_task       → Dispara Manus IA        │       │      │
│  │  │                   manusService.run(prompt)  │       │      │
│  │  │                   Aguarda até 120s          │       │      │
│  │  │                   Polls a cada 2s           │       │      │
│  │  ├────────────────────────────────────────────┤       │      │
│  │  │ send_notification→ Registra notificação    │       │      │
│  │  ├────────────────────────────────────────────┤       │      │
│  │  │ erp_sync         → Inicia sync com ERP     │       │      │
│  │  ├────────────────────────────────────────────┤       │      │
│  │  │ generate_report  → Gera relatório          │       │      │
│  │  ├────────────────────────────────────────────┤       │      │
│  │  │ webhook          → Chama URL externa       │       │      │
│  │  │                   POST + JSON payload      │       │      │
│  │  ├────────────────────────────────────────────┤       │      │
│  │  │ send_email       → Envia email             │       │      │
│  │  ├────────────────────────────────────────────┤       │      │
│  │  │ send_whatsapp    → Envia msg WhatsApp      │       │      │
│  │  └────────────────────────────────────────────┘       │      │
│  │                                                        │      │
│  │  4. Atualiza log: "completed" ou "error"              │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                   │
│  ┌─── Scheduler (Fallback) ──────────────────────────────┐      │
│  │                                                        │      │
│  │  startScheduler()                                      │      │
│  │  → setInterval(60000) — verifica a cada 60s           │      │
│  │                                                        │      │
│  │  checkScheduledTasks()                                 │      │
│  │  → JOIN scheduled_tasks + automations                 │      │
│  │  → WHERE isActive = true AND nextRunAt <= agora       │      │
│  │  → Executa runAutomation() para cada task due         │      │
│  │  → Calcula nextRunAt baseado em intervalMinutes       │      │
│  │  → Atualiza lastRunAt                                 │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                   │
│  Integração com Manus IA:                                         │
│  • action "agent_task" → manusService.run(userId, prompt)        │
│  • Aguarda execução com polling (até 120s)                       │
│  • Verifica status: completed | stopped | error                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Engine Proxy (Node.js → Python)

O proxy traduz chamadas `/api/automation-engine/*` para o FastAPI em `:8005`:

```
┌──────────────────────────────────────────────────────────────────┐
│  Engine Proxy                                                     │
│  server/automations/engine-proxy.ts (267 linhas)                  │
│                                                                   │
│  Config:                                                          │
│  AUTOMATION_ENGINE_HOST = localhost (ou env var)                   │
│  AUTOMATION_ENGINE_PORT = 8005                                    │
│  TIMEOUT = 30 segundos                                            │
│                                                                   │
│  Tradução:                                                        │
│                                                                   │
│  /api/automation-engine/health     → GET  :8005/health            │
│  /api/automation-engine/version    → GET  :8005/version           │
│  /api/automation-engine/metrics    → GET  :8005/metrics           │
│                                                                   │
│  /api/automation-engine/scheduler/ → :8005/scheduler/             │
│    entries (GET/POST/DELETE)                                      │
│    start (POST)                                                   │
│    stop (POST)                                                    │
│                                                                   │
│  /api/automation-engine/events/    → :8005/events/                │
│    emit (POST)                                                    │
│    subscribe (POST)                                               │
│    subscribers (GET)                                               │
│    history (GET)                                                   │
│    types (GET)                                                    │
│                                                                   │
│  /api/automation-engine/workflows/ → :8005/workflows/             │
│    register (POST)                                                │
│    list (GET)                                                     │
│    get/:id (GET)                                                  │
│    execute/:id (POST)                                             │
│    executions/:id (GET)                                           │
│                                                                   │
│  /api/automation-engine/executions → :8005/executions             │
│  /api/automation-engine/cron/validate → :8005/cron/validate       │
│                                                                   │
│  Se engine offline → retorna { status: "offline" } no /health    │
│  Demais rotas → 502 Bad Gateway se timeout                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. XOS Automations (CRM Workflows)

Automações específicas do CRM com triggers baseados em eventos de negócio:

```
┌──────────────────────────────────────────────────────────────────┐
│  XOS Automations                                                  │
│  Tabela: xos_automations — shared/schema.ts:6593                 │
│  UI: client/src/pages/XosAutomations.tsx (350 linhas)            │
│                                                                   │
│  ┌─── Schema ────────────────────────────────────────────┐      │
│  │                                                        │      │
│  │  id               serial PK                            │      │
│  │  tenantId          FK → tenants.id                     │      │
│  │  name             varchar(200) NOT NULL                │      │
│  │  description      text                                 │      │
│  │  triggerType      varchar(50) NOT NULL                 │      │
│  │  triggerConfig    JSONB { condições do trigger }       │      │
│  │  actions          JSONB [ { type, config } ]           │      │
│  │  conditions       JSONB [ { field, operator, value } ] │      │
│  │  isActive         boolean (default true)               │      │
│  │  executionCount   integer (default 0)                  │      │
│  │  lastExecutedAt   timestamp                            │      │
│  │  createdBy        FK → users.id                        │      │
│  │  createdAt, updatedAt  timestamp                       │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                   │
│  ┌─── Triggers CRM ─────────────────────────────────────┐      │
│  │                                                        │      │
│  │  contact_created    → Novo contato cadastrado          │      │
│  │  deal_stage_changed → Deal mudou de estágio            │      │
│  │  form_submitted     → Formulário preenchido            │      │
│  │  ticket_created     → Ticket de suporte aberto         │      │
│  │  deal_won           → Negócio fechado (ganho)          │      │
│  │  deal_lost          → Negócio perdido                  │      │
│  │  message_received   → Mensagem WhatsApp recebida       │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                   │
│  ┌─── Ações CRM ────────────────────────────────────────┐      │
│  │                                                        │      │
│  │  send_email         → Email automático                 │      │
│  │  send_whatsapp      → Mensagem WhatsApp               │      │
│  │  create_task        → Cria tarefa/atividade            │      │
│  │  assign_agent       → Atribui agente ao ticket         │      │
│  │  update_field       → Atualiza campo do registro       │      │
│  │  move_deal_stage    → Move deal no pipeline            │      │
│  │  webhook            → Chama URL externa                │      │
│  │  notify_team        → Notifica equipe                  │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                   │
│  Diferença vs automations genérica:                               │
│  • xos_automations → multi-tenant (tenantId)                     │
│  • xos_automations → triggers de negócio (CRM)                   │
│  • xos_automations → conditions inline (JSONB array)             │
│  • automations     → por usuário (userId)                        │
│  • automations     → triggers genéricos (schedule/webhook/manual)│
└──────────────────────────────────────────────────────────────────┘
```

---

## 6. Banco de Dados — Tabelas

### 6.1 — automations (Automações Genéricas)

```
┌──────────────────────────────────────────────────────────────────┐
│  automations — shared/schema.ts:582                               │
│                                                                   │
│  id            serial PK                                          │
│  userId        FK → users.id (CASCADE)                            │
│  name          text NOT NULL                                      │
│  description   text                                               │
│  triggerType   text NOT NULL                                      │
│                  "schedule" | "webhook" | "manual" | "event"      │
│  triggerConfig text (JSON stringified)                            │
│  isActive      "true" | "false"                                   │
│  createdAt     timestamp                                          │
│  updatedAt     timestamp                                          │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 — automation_actions (Ações da Automação)

```
┌──────────────────────────────────────────────────────────────────┐
│  automation_actions — shared/schema.ts:594                        │
│                                                                   │
│  id              serial PK                                        │
│  automationId    FK → automations.id (CASCADE)                    │
│  orderIndex      integer (ordem de execução)                      │
│  actionType      text NOT NULL                                    │
│                    "agent_task" | "send_notification" |           │
│                    "erp_sync" | "generate_report" |              │
│                    "webhook" | "send_email" | "send_whatsapp"    │
│  actionConfig    text (JSON: url, method, to, prompt, etc.)      │
│  conditionConfig text (JSON: condição para executar)             │
└──────────────────────────────────────────────────────────────────┘
```

### 6.3 — automation_logs (Histórico de Execuções)

```
┌──────────────────────────────────────────────────────────────────┐
│  automation_logs — shared/schema.ts:603                           │
│                                                                   │
│  id            serial PK                                          │
│  automationId  FK → automations.id (CASCADE)                      │
│  status        "running" | "completed" | "error"                  │
│  triggerData   text (JSON: dados que dispararam)                  │
│  result        text (resultado da execução)                       │
│  error         text (mensagem de erro, se falhou)                 │
│  startedAt     timestamp                                          │
│  completedAt   timestamp                                          │
└──────────────────────────────────────────────────────────────────┘
```

### 6.4 — scheduled_tasks (Tarefas Agendadas)

```
┌──────────────────────────────────────────────────────────────────┐
│  scheduled_tasks — shared/schema.ts:614                           │
│                                                                   │
│  id              serial PK                                        │
│  automationId    FK → automations.id (CASCADE)                    │
│  cronExpression  text ("0 9 * * 1-5")                             │
│  intervalMinutes integer (alternativa ao cron)                    │
│  nextRunAt       timestamp (próxima execução)                     │
│  lastRunAt       timestamp (última execução)                      │
│  isActive        "true" | "false"                                 │
│                                                                   │
│  Dois modos:                                                      │
│  1. cronExpression → Parser Python (5 partes)                    │
│  2. intervalMinutes → Simples: nextRunAt += interval              │
└──────────────────────────────────────────────────────────────────┘
```

### 6.5 — xos_automations (CRM Automations)

```
┌──────────────────────────────────────────────────────────────────┐
│  xos_automations — shared/schema.ts:6593                         │
│                                                                   │
│  id              serial PK                                        │
│  tenantId        FK → tenants.id (CASCADE)                        │
│  name            varchar(200) NOT NULL                            │
│  description     text                                             │
│  triggerType     varchar(50) NOT NULL                             │
│  triggerConfig   JSONB                                            │
│  actions         JSONB [ { type, config } ]                      │
│  conditions      JSONB [ { field, operator, value } ]            │
│  isActive        boolean (default true)                           │
│  executionCount  integer (default 0)                              │
│  lastExecutedAt  timestamp                                        │
│  createdBy       FK → users.id                                    │
│  createdAt, updatedAt  timestamp                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. API REST Completa

### 7.1 — CRUD Automações (/api/automations/*)

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/automations` | Lista automações do usuário |
| GET | `/api/automations/:id` | Detalhe (com actions + schedule) |
| POST | `/api/automations` | Cria automação (+ actions + schedule) |
| PUT | `/api/automations/:id` | Atualiza automação completa |
| DELETE | `/api/automations/:id` | Exclui automação (cascade) |
| POST | `/api/automations/:id/run` | Executa manualmente |
| GET | `/api/automations/:id/logs` | Histórico de execuções (últimas 50) |

### 7.2 — Automation Engine (/api/automation-engine/*)

#### Saúde e Métricas

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/health` | Status (online/offline + stats) |
| GET | `/version` | Versão + capabilities |
| GET | `/metrics` | Métricas: scheduler, event_bus, workflows |

#### Scheduler

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/scheduler/entries` | Lista entradas cron |
| POST | `/scheduler/entries` | Adiciona entrada cron |
| DELETE | `/scheduler/entries/:id` | Remove entrada |
| POST | `/scheduler/start` | Inicia loop do scheduler |
| POST | `/scheduler/stop` | Para loop do scheduler |

#### Event Bus

| Método | Endpoint | Função |
|--------|----------|--------|
| POST | `/events/emit` | Emite evento |
| POST | `/events/subscribe` | Registra handler |
| GET | `/events/subscribers` | Lista assinantes |
| GET | `/events/history` | Histórico de eventos |
| GET | `/events/types` | Tipos de eventos disponíveis |

#### Workflows

| Método | Endpoint | Função |
|--------|----------|--------|
| POST | `/workflows/register` | Registra workflow (steps) |
| GET | `/workflows` | Lista workflows |
| GET | `/workflows/:id` | Detalhe do workflow |
| POST | `/workflows/:id/execute` | Executa workflow |
| GET | `/workflows/:id/executions` | Execuções do workflow |
| GET | `/executions` | Todas as execuções |

#### Cron

| Método | Endpoint | Função |
|--------|----------|--------|
| POST | `/cron/validate` | Valida expressão cron + próximas 5 execuções |

**Total: 27+ endpoints de automação**

---

## 8. Frontend — Interfaces

### 8.1 — Automations.tsx (Gestão Geral)

```
┌──────────────────────────────────────────────────────────────────┐
│  Automations.tsx — 559 linhas                                     │
│  Rota: /automations                                               │
│                                                                   │
│  Componentes:                                                     │
│                                                                   │
│  ┌── CreateAutomationDialog ─────────────────────────────┐      │
│  │  • Nome, descrição                                     │      │
│  │  • Tipo de trigger: schedule | webhook | manual | event│      │
│  │  • Config do trigger (JSON)                            │      │
│  │  • Actions: lista de { actionType, actionConfig }     │      │
│  │  • Schedule: cronExpression ou intervalMinutes          │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                   │
│  ┌── AutomationCard ────────────────────────────────────┐       │
│  │  • Nome, tipo de trigger, status (ativo/inativo)      │      │
│  │  • Botão: Executar agora                              │      │
│  │  • Botão: Ativar/Desativar                           │      │
│  │  • Botão: Excluir                                     │      │
│  │  • Logs de execução (últimas 50)                      │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                   │
│  Lista todas as automações do usuário logado                     │
└──────────────────────────────────────────────────────────────────┘
```

### 8.2 — XosAutomations.tsx (CRM Workflows)

```
┌──────────────────────────────────────────────────────────────────┐
│  XosAutomations.tsx — 350 linhas                                  │
│  Rota: /xos/automations                                           │
│                                                                   │
│  Foco em automações de CRM:                                       │
│  • Triggers de negócio (contact_created, deal_stage_changed)     │
│  • Ações comerciais (send_email, assign_agent, move_deal)        │
│  • Condições inline (campo, operador, valor)                     │
│  • Contagem de execuções e última execução                       │
│  • Vinculado ao tenant (multi-tenant)                            │
└──────────────────────────────────────────────────────────────────┘
```

### 8.3 — WorkflowBuilder.tsx (Editor Visual)

```
┌──────────────────────────────────────────────────────────────────┐
│  WorkflowBuilder.tsx — 493 linhas                                 │
│  Rota: /workflow-builder                                          │
│                                                                   │
│  Editor visual de workflows:                                      │
│  • Drag & drop de steps                                          │
│  • Configuração de cada step (type + config)                     │
│  • Visualização do fluxo                                         │
│  • Registro no Workflow Executor do engine                       │
│  • Execução e monitoramento                                     │
└──────────────────────────────────────────────────────────────────┘
```

### 8.4 — BPMN (Diagramas de Processo)

```
┌──────────────────────────────────────────────────────────────────┐
│  BpmnDiagram.tsx — 645 linhas                                     │
│  ProcessDiagram.tsx — 184 linhas                                  │
│  BpmnPage.tsx — 12 linhas (wrapper)                               │
│                                                                   │
│  Visualização BPMN de processos:                                  │
│  • Render de diagramas BPMN 2.0                                  │
│  • Nós: start, end, task, gateway, event                         │
│  • Conexões direcionais                                          │
│  • Zoom e pan                                                    │
│  • Usado no Process Compass (Módulo Consultivo)                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 9. Fluxo de Execução Completo

### 9.1 — Automação Manual (Trigger: manual)

```
Usuário clica "Executar" na UI
        │
        ▼
POST /api/automations/:id/run
        │
        ▼
AutomationService.runAutomation()
        │
        ├──▶ INSERT automation_logs (status: "running")
        │
        ├──▶ SELECT automation_actions ORDER BY orderIndex
        │
        ├──▶ Para cada action:
        │    ├── agent_task    → manusService.run() → GPT-4o
        │    ├── webhook       → fetch(url, POST, body)
        │    ├── send_email    → (placeholder)
        │    ├── send_whatsapp → (placeholder)
        │    ├── erp_sync      → (placeholder)
        │    └── generate_report → (placeholder)
        │
        └──▶ UPDATE automation_logs (status: "completed")
```

### 9.2 — Automação Agendada (Trigger: schedule)

```
┌───────────────────── Scheduler Python ──────────────────────┐
│                                                              │
│  Thread daemon (30s loop)                                    │
│  ↓                                                           │
│  CronExpression.matches(agora)? → SIM                       │
│  ↓                                                           │
│  event_bus.emit("schedule.fired", {automation_id: 42})      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
        │
        ▼ (subscriber triggerado)
Handler executa ação configurada

┌───────────── OU ── Scheduler Node.js (Fallback) ────────────┐
│                                                              │
│  setInterval(60000) → checkScheduledTasks()                 │
│  ↓                                                           │
│  SELECT scheduled_tasks                                      │
│  JOIN automations                                           │
│  WHERE isActive AND nextRunAt <= NOW()                       │
│  ↓                                                           │
│  AutomationService.runAutomation(id, userId)                │
│  ↓                                                           │
│  UPDATE nextRunAt = NOW() + intervalMinutes                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 9.3 — Workflow Engine (Multi-Step)

```
POST /api/automation-engine/workflows/register
        │
        ▼ Registra WorkflowDefinition com N steps
        
POST /api/automation-engine/workflows/:id/execute
        │
        ▼
WorkflowExecutor.execute(workflow_id, trigger_data, variables)
        │
        ▼
┌────────────── EXECUÇÃO SEQUENCIAL ──────────────────────────┐
│                                                              │
│  Step 1: condition                                          │
│  ├── field: "revenue" operator: ">" value: 10000            │
│  └── result: true → continua                                │
│                                                              │
│  Step 2: query                                              │
│  ├── sql: "SELECT COUNT(*) FROM crm_leads WHERE ..."       │
│  └── output: { query_result: [{count: 42}] }               │
│                                                              │
│  Step 3: http                                               │
│  ├── url: "https://api.slack.com/webhook"                   │
│  ├── method: "POST"                                         │
│  └── body: { text: "42 novos leads!" }                     │
│                                                              │
│  Step 4: transform                                          │
│  ├── operation: "sum", source: "query_result"               │
│  └── output: { sum: 42 }                                   │
│                                                              │
│  Step 5: notify                                             │
│  ├── message: "Pipeline atualizado"                         │
│  └── channel: "system"                                      │
│                                                              │
│  → status: "completed", steps_completed: 5/5               │
└──────────────────────────────────────────────────────────────┘
```

---

## 10. Integração com Outros Sistemas

```
┌─────────────────────────────────────────────────────────────────────┐
│                   INTEGRAÇÕES DA AUTOMAÇÃO                           │
│                                                                      │
│  ┌───────── Manus IA (GPT-4o) ─────────────────────────────┐      │
│  │  action: "agent_task"                                     │      │
│  │  → manusService.run(userId, prompt)                      │      │
│  │  → Polling até 120s para conclusão                        │      │
│  │  → Retorna resultado do agente                            │      │
│  └───────────────────────────────────────────────────────────┘      │
│                                                                      │
│  ┌───────── WhatsApp (Baileys) ──────────────────────────────┐     │
│  │  action: "send_whatsapp"                                   │     │
│  │  trigger: "message_received" (xos_automations)             │     │
│  │  → Integra via CommunicationService                        │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  ┌───────── ERPNext/SOE ─────────────────────────────────────┐     │
│  │  action: "erp_sync"                                        │     │
│  │  trigger: "record.created" / "record.updated"              │     │
│  │  → Sincroniza entidades com motor SOE                      │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  ┌───────── Webhooks Externos ───────────────────────────────┐     │
│  │  action: "webhook"                                         │     │
│  │  trigger: "webhook.received"                               │     │
│  │  → HTTP POST/GET com payload JSON                         │     │
│  │  → Slack, Zapier, n8n, APIs externas                      │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  ┌───────── Knowledge Graph ─────────────────────────────────┐     │
│  │  Eventos de automação alimentam o Knowledge Graph         │     │
│  │  via comm_events → graph_nodes + graph_edges              │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  ┌───────── Casa de Máquinas ─────────────────────────────────┐    │
│  │  Monitora status do Automation Engine (:8005)               │    │
│  │  GET /api/automation-engine/health                          │    │
│  │  Exibe: scheduler stats, event_bus stats, workflow stats    │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 11. Arquivos-Chave

| Arquivo | Função | Linhas |
|---------|--------|--------|
| `server/python/automation_engine.py` | Motor FastAPI (Scheduler + EventBus + Workflows) | 668 |
| `server/automations/service.ts` | AutomationService (executor + scheduler fallback) | 209 |
| `server/automations/routes.ts` | CRUD API (/api/automations/*) | 343 |
| `server/automations/engine-proxy.ts` | Proxy Node → Python (:8005) | 267 |
| `shared/schema.ts` (L582-636) | 4 tabelas: automations, actions, logs, scheduled | 55 |
| `shared/schema.ts` (L6593-6608) | xos_automations (CRM workflows) | 16 |
| `client/src/pages/Automations.tsx` | Interface CRUD geral | 559 |
| `client/src/pages/XosAutomations.tsx` | Interface CRM automations | 350 |
| `client/src/pages/WorkflowBuilder.tsx` | Editor visual de workflows | 493 |
| `client/src/components/BpmnDiagram.tsx` | Diagrama BPMN | 645 |
| `client/src/components/ProcessDiagram.tsx` | Diagrama de processos | 184 |

---

## 12. Resumo Visual

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ARCÁDIA AUTOMAÇÕES STACK                           │
│                                                                      │
│  ┌─── Frontend ──────────────────────────────────────────────┐     │
│  │  Automations.tsx │ XosAutomations.tsx │ WorkflowBuilder    │     │
│  │  BPMN Viewer     │ ProcessDiagram     │                    │     │
│  └──────────────────────────┬────────────────────────────────┘     │
│                              │                                      │
│  ┌──────────────────────────▼────────────────────────────────┐     │
│  │  Node.js Gateway (:5000)                                   │     │
│  │                                                            │     │
│  │  /api/automations/*        → CRUD (Drizzle ORM)           │     │
│  │  /api/automation-engine/*  → Proxy para :8005             │     │
│  │  AutomationService         → Executor + Scheduler 60s    │     │
│  └──────────────────────────┬────────────────────────────────┘     │
│                              │                                      │
│  ┌──────────────────────────▼────────────────────────────────┐     │
│  │  Python FastAPI (:8005)                                    │     │
│  │                                                            │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐        │     │
│  │  │ Scheduler│  │Event Bus │  │Workflow Executor  │        │     │
│  │  │ 30s loop │  │ Pub/Sub  │  │ 10 step types    │        │     │
│  │  │ Cron 5pt │  │ 9 events │  │ SQL/HTTP/Logic   │        │     │
│  │  └──────────┘  └──────────┘  └──────────────────┘        │     │
│  └───────────────────────────────────────────────────────────┘     │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────┐     │
│  │  PostgreSQL: 5 tabelas                                     │     │
│  │  automations, automation_actions, automation_logs,         │     │
│  │  scheduled_tasks, xos_automations                          │     │
│  └───────────────────────────────────────────────────────────┘     │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────┐     │
│  │  Integrações: Manus IA, WhatsApp, ERPNext, Webhooks,      │     │
│  │  Knowledge Graph, Casa de Máquinas                         │     │
│  └───────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```
