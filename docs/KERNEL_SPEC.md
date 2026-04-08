# Especificação Técnica: Arcadia Kernel

> **Versão:** 3.2  
> **Status:** Em desenvolvimento (Semana 5)  
> **Última atualização:** 2026-04-08

---

## 1. Visão Geral

O **Arcadia Kernel** é o sistema operacional nativo da ArcadiaSuite - um orquestrador de serviços em Node.js que unifica discovery, health monitoring e gerenciamento de processos.

### 1.1 Objetivos

- **Discovery**: Descobrir automaticamente todos os serviços do ecossistema
- **Orquestração**: Iniciar, parar e reiniciar serviços (processos e containers)
- **Observabilidade**: Health checks, logs e métricas centralizados
- **Integração**: Unificar visão da Casa de Máquinas com dados reais

### 1.2 Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                      ARCADIA KERNEL (5001)                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Dashboard  │  │   Process   │  │      LogAggregator      │ │
│  │   (Web UI)  │  │   Manager   │  │                         │ │
│  └──────┬──────┘  └──────┬──────┘  └─────────────────────────┘ │
│         │                │                                      │
│         └────────────────┴────────────────┐                     │
│                          │                │                     │
│              ┌───────────┴───────────┐   │                     │
│              │   Service Registry    │   │                     │
│              │  (Unified Discovery)  │   │                     │
│              └───────────┬───────────┘   │                     │
│                          │               │                     │
│    ┌─────────────────────┼───────────────┘                     │
│    │                     │                                      │
│ ┌──┴──┐  ┌──────────┐  ┌┴─────────┐  ┌──────────┐  ┌────────┐ │
│ │Static│  │ Coolify  │  │   XOS    │  │  Docker  │  │  ...   │ │
│ │Disc. │  │  Disc.   │  │  Disc.   │  │  Disc.   │  │        │ │
│ └──┬──┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘ │
│    │          │             │             │            │      │
│    └──────────┴─────────────┴─────────────┴────────────┘      │
│                         │                                      │
│              ┌──────────┴──────────┐                          │
│              │   UnifiedRegistry   │                          │
│              │  (Agregação + Dedu) │                          │
│              └──────────┬──────────┘                          │
└─────────────────────────┼─────────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
      ┌──┴──┐         ┌──┴──┐         ┌──┴──┐
      │5000 │         │5001 │         │8080 │
      │App  │         │Kernel│         │Plus │
      └─────┘         └─────┘         └─────┘
```

---

## 2. Componentes

### 2.1 Core (ProcessManager, HealthMonitor, LogAggregator)

**Status:** ✅ Estável

- **ProcessManager**: Gerencia processos Node.js/Python locais
- **HealthMonitor**: Health checks periódicos
- **LogAggregator**: Coleta e armazena logs

### 2.2 Service Registry

**Status:** ✅ Implementado

Catálogo central de serviços com:
- Registro manual ou automático
- Health status tracking
- Capabilities e metadados
- Eventos (service:registered, service:health_changed, etc)

### 2.3 Discovery Providers

| Provider | Status | Descrição |
|----------|--------|-----------|
| `StaticDiscovery` | ✅ | DNS interno (nomes fixos) |
| `CoolifyDiscovery` | ✅ | API Coolify (produção) |
| `DockerDiscovery` | ✅ | Docker labels (fallback) |
| `XOSDiscovery` | ✅ | Banco XOS (filas, integrações) |
| `UnifiedRegistry` | ⏳ | Agregador (Semana 5) |

---

## 3. Discovery Providers

### 3.1 StaticDiscovery

Descobre serviços via nomes DNS fixos na rede Docker.

```typescript
// Ex: http://contabil:8003, http://bi:8004
```

### 3.2 CoolifyDiscovery

Consulta API Coolify para descobrir serviços em produção.

**Endpoints:**
- `GET /api/v1/services` - Docker Compose services
- `GET /api/v1/applications` - Aplicações

**Filtro:** `arcadia.discovery.enabled=true`

### 3.3 DockerDiscovery

Lê labels de containers Docker na rede local.

**Labels:**
- `arcadia.discovery.enabled=true`
- `arcadia.name=MetaSet BI`
- `arcadia.type=python`
- `arcadia.port=8100`
- `arcadia.capabilities=dashboards,charts,sql_lab`

### 3.4 XOSDiscovery

Consulta banco de dados para descobrir serviços XOS.

**Descobre:**
- Filas de atendimento (`xos_queues`)
- Integrações WhatsApp (`whatsapp_sessions`)
- Automações ativas (`xos_automations`)

---

## 4. API do Kernel

### 4.1 Endpoints Core

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/health` | GET | Health check do Kernel |
| `/api/kernel/services` | GET | Lista serviços do ProcessManager |
| `/api/kernel/services/:id/start` | POST | Inicia serviço |
| `/api/kernel/services/:id/stop` | POST | Para serviço |
| `/api/kernel/services/:id/restart` | POST | Reinicia serviço |
| `/api/kernel/services/:id/logs` | GET | Logs do serviço |

### 4.2 Endpoints Registry

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/registry/services` | GET | Lista serviços descobertos |
| `/api/registry/services/:id` | GET | Detalhes de um serviço |
| `/api/registry/by-category/:cat` | GET | Serviços por categoria |
| `/api/registry/by-capability/:cap` | GET | Serviços por capability |
| `/api/registry/stats` | GET | Estatísticas do registry |
| `/api/registry/discover` | POST | Força discovery manual |

### 4.3 Endpoints Casa de Máquinas

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/engine-room/status` | GET | Status unificado (Registry + Presets) |
| `/api/engine-room/engine/:name/health` | GET | Health de um motor |
| `/api/engine-room/engine/:name/start` | POST | Inicia motor |
| `/api/engine-room/engine/:name/stop` | POST | Para motor |
| `/api/engine-room/engine/:name/restart` | POST | Reinicia motor |
| `/api/engine-room/engine/:name/logs` | GET | Logs do motor |

---

## 5. Integração Casa de Máquinas

### 5.1 Fluxo de Dados

```
Casa de Máquinas (React)
         │
         ▼
/api/engine-room/status
         │
         ▼
┌─────────────────┐
│  fetchRegistry  │ ◄── Tenta Registry primeiro
│    Services()   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐  ┌────────┐
│Registry│  │Fallback│
│  OK   │  │Kernel  │
└───┬───┘  │Adapter │
    │      └───┬────┘
    │          │
    └────┬─────┘
         ▼
┌─────────────────┐
│  Adiciona       │
│  Externos       │ ◄── Plus, MetaSet (se não no Registry)
│  (se necessário)│
└────────┬────────┘
         ▼
    Resposta JSON
         │
         ▼
    Frontend Render
```

### 5.2 Lógica de Deduplicação

```typescript
// 1. Consulta Registry
const registryServices = await fetchRegistryServices();

// 2. Se Registry tem dados, usa eles
if (registryServices?.length > 0) {
  engines = registryServices.map(mapRegistryToEngine);
}
// 3. Senão, fallback para kernel-adapter
else {
  engines = await getKernelEngines();
}

// 4. Adiciona externos apenas se não existirem
if (!engines.find(e => e.name === "plus")) {
  engines.push(await checkEngineHealth(plusEngine));
}

// 5. MetaSet só adiciona se não houver bi-engine
if (!engines.find(e => e.name === "metaset" || e.name === "bi-engine")) {
  engines.push(await checkEngineHealth(metasetEngine));
}
```

---

## 6. Configuração

### 6.1 Variáveis de Ambiente

```bash
# Kernel
KERNEL_ENABLED=true
KERNEL_AUTOSTART=true

# Coolify Discovery
COOLIFY_API_TOKEN=seu_token_aqui

# MetaSet
METASET_HOST=metaset
METASET_PORT=8100

# Modo Docker (desativa spawn de processos)
DOCKER_MODE=true
```

### 6.2 Docker Compose Labels

```yaml
services:
  metaset:
    labels:
      - "arcadia.discovery.enabled=true"
      - "arcadia.name=MetaSet BI"
      - "arcadia.type=python"
      - "arcadia.category=bi"
      - "arcadia.port=8100"
      - "arcadia.capabilities=dashboards,charts,sql_lab"
```

---

## 7. Roadmap

### Semana 4 ✅ CONCLUÍDO
- [x] Service Registry
- [x] StaticDiscovery
- [x] CoolifyDiscovery
- [x] DockerDiscovery
- [x] Integração com Casa de Máquinas

### Semana 5 EM ANDAMENTO
- [x] XOSDiscovery
- [ ] UnifiedRegistry (agregador)
- [ ] Deduplicação automática
- [ ] Priorização de providers

### Semana 6 PLANEJADO
- [ ] Maestro IA (Guardião de IAs)
- [ ] Policy Engine
- [ ] Audit Trail

### Semana 7 PLANEJADO
- [ ] Integração completa Maestro
- [ ] Documentação P2P

---

## 8. Histórico de Mudanças

| Data | Versão | Mudança |
|------|--------|---------|
| 2026-04-06 | 3.0 | Service Registry + Discovery |
| 2026-04-07 | 3.1 | Integração Casa de Máquinas |
| 2026-04-08 | 3.2 | Coolify Discovery implementado, XOS Discovery, correção MetaSet |

---

## 9. Referências

- `/server/kernel/` - Código fonte do Kernel
- `/server/kernel/registry/` - Service Registry
- `/server/kernel/discovery/` - Discovery Providers
- `/server/engine-room/` - Casa de Máquinas (backend)
- `/client/src/pages/Admin.tsx` - Casa de Máquinas (frontend)
- `/home/ubuntu/.kimi/kernel e tenants.md` - Planejamento executivo
