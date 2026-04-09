---
⚠️ **AVISO: DOCUMENTAÇÃO HISTÓRICA**

Este documento foi criado em **Março/2026** como planejamento estratégico.
Pode conter informações desatualizadas em relação ao sistema atual.

Para documentação técnica atualizada, consulte:
- \_SPEC_NAVBAR.md\_ (componentes UI)
- \_KERNEL_SPEC.md\_ (arquitetura do Kernel)
- Código-fonte em \_server/modules/\_

---

# Índice: PLANEJAMENTO ESTRATÉGICO ARCÁDIA AGENTIC SUITE

**Documento:** `/home/ubuntu/# PLANEJAMENTO ESTRATÉGICO ARCÁDIA.txt`
**Versão:** 1.0 — Março 2026
**Estado:** Pronto para Implementação

---

## 📑 ESTRUTURA DO DOCUMENTO

### 1. **Executive Summary** (Seção 1)
- Visão: ERP tradicional → **Sistema Agêntico Orientado a Objetos**
- 5 decisões arquiteturais críticas (MiroFlow, OpenClaw, Superset, Skills POO, Automações)

### 2. **Arquitetura de Alto Nível** (Seção 2)
```
Interface Unificada (Chat + Dev Center + OpenClaw + BI)
         ↓
Orquestradores (Manus + Blackboard + Automation Fabric)
         ↓
Motores Especializados Embutidos (MiroFlow + OpenClaw + Skill Engine)
         ↓
Infraestrutura (Knowledge Graph + PostgreSQL + Ollama/DeepSeek)
```

### 3. **Componentes Embutidos** (Seção 3+)

| Componente | Status | Local | Propósito |
|-----------|--------|-------|----------|
| **MiroFlow** | ✅ | `server/modules/miroflow/` | Motor científico, benchmarks, análise estatística |
| **OpenClaw** | 🔄 | `server/modules/openclaw/` + `client/src/components/openclaw/` | Detecção padrões, sugestão proativa, skills emergentes |
| **Skills Engine** | ✅ | `server/skills/` | POO: herança, composição, polimorfismo, versionamento |
| **Automation Fabric** | ⏳ | `server/modules/automation/` | Runtime unificado: Workflow, Rule, Agent, Schedule, Event |
| **Dev Center** | ⏳ | `client/src/pages/DevCenter.tsx` | Design → Assemble → Deploy de agentes |
| **Superset Integration** | ⏳ | `server/modules/superset/` | BI visual + MiroFlow bridge |

### 4. **Skills Engine POO** (Seção 4)
- ✅ Herança: `extends`, `isA`
- ✅ Composição: `dependencies`, `requires`
- ✅ Polimorfismo: `useMiroFlow`, `autoApprove`
- ✅ Versionamento Git-like (createVersion, listVersions, rollback, fork, diff)
- ✅ Marketplace / Biblioteca (import de skills públicas)

### 5. **Automation Fabric Unificada** (Seção 6)
- Runtime com suporte: Workflow, Rule, Agent, Schedule, Event
- Trigger-based (webhook, database, schedule, event)
- Integração com Blackboard para codegen

### 6. **Dev Center Completo** (Seção 8)
- **Design Studio**: UML, Visual, Markdown
- **Assemble Line**: Integração com Blackboard
- **Orchestrate Center**: Deploy, monitoramento
- **Galeria de Agentes**: Marketplace interno

### 7. **Infraestrutura** (Seção 9)
- PostgreSQL 16 + pgvector
- Neo4j (Knowledge Graph)
- Ollama (LLMs locais: deepseek-r1:32b/70b, llama3.1:8b/70b)
- Apache Superset (BI visual)

---

## 🗺️ ROADMAP E STATUS

### ✅ Fase 1: Fundação (Semanas 1-2)
**Status: CONCLUÍDA (2026-03-25)**
- Submodules MiroFlow + OpenClaw
- Tabelas skills, skill_executions
- Neo4j no Docker
- ReferenceParser/Resolver
- Superset + Ollama

**Entregável:** Infraestrutura base ✅

---

### ✅ Fase 2: Skills Engine (Semanas 3-4)
**Status: CONCLUÍDA (25/03/2026 - 15:04)**
- SkillEngine com herança/composição
- API REST CRUD + execução + histórico
- Editor Monaco (tabs Geral/Body/Params)
- Versionamento Git-like (VersionManager)
- Skill Marketplace / Biblioteca

**Entregável:** Skills criáveis, versionáveis, executáveis ✅

---

### ✅ Fase 3: MiroFlow Embutido (Semanas 5-6)
**Status: CONCLUÍDA PARCIAL (25/03/2026 - 15:04)**

**Implementado:**
- Adapt MiroFlow para Ollama local (llama3.2:3b / deepseek-r1:14b)
- Containerização em docker-compose.prod.yml
- Agentes especializados (Statistician, Auditor, Researcher)
- Proxy Node.js: `/api/miroflow/analyze`
- UI MiroFlowControl (tab Científico em /insights)

**Pendente:**
- [ ] MiroFlowBridge para Superset
- [ ] Integração com Arcádia Audit (imutabilidade)
- [ ] Dashboard de benchmarks no Dev Center
- [ ] **Tool SQL via Skills** (skill `db_query` como MCP tool)

**Entregável:** Análises científicas (ETA completo: 08/04/2026)

---

### 🔄 Fase 4: OpenClaw Embutido (Semanas 7-8)
**Status: SPRINT 1 COMPLETO (26/03/2026) | Sprints 2-3 Em Progresso**

#### ✅ Sprint 1: Backend (COMPLETO - 26/03)
- [x] PatternDetector.ts — detecção (3+ em 30d), confiança, Neo4j
- [x] OpenClawEngine.ts — orquestração, sugestões, scheduler, Socket.IO
- [x] SkillEmergence.ts — Blackboard codegen, validação, DRAFT storage
- [x] routes.ts — 10 endpoints REST
- [x] arcadia.config.yaml — pattern detection, suggestions, emergence

#### ⏳ Sprint 2: Frontend (PRÓXIMO - 28-29/03)
- [ ] OpenClawWidget.tsx — widget flutuante de sugestão
- [ ] SkillSuggestion.tsx — modal de sugestão
- [ ] useAgentEmergence.ts — hook de lógica
- [ ] Integração em App.tsx (layout principal)

#### ⏳ Sprint 3: Config + Testes (30-31/03)
- [ ] Schema database (detectedPatterns, skillSuggestions)
- [ ] Migration SQL (migrations/0004_openclaw_tables.sql)
- [ ] Testes unitários
- [ ] Documentação

**Fluxo:** Padrão → Detector → Engine → Sugestão → Widget → User → Blackboard → SkillEmergence → DRAFT → Dev Center → Publicada

**Entregável:** Skills emergentes (ETA: 08/04/2026)

---

### ⏳ Fase 5: Automation Fabric (Semanas 9-10)
**Status: PENDENTE**
- [ ] Unificar XOS/Automations + Central /automations
- [ ] 4 runtimes: Workflow, Rule, Agent, Schedule, Event
- [ ] UI única no Dev Center
- [ ] Migração dados existentes
- [ ] Testes carga/segurança

**Entregável:** Automações unificadas

---

### ⏳ Fase 6: Dev Center Completo (Semanas 11-12)
**Status: PENDENTE**
- [ ] Design Studio (UML, Visual, Markdown)
- [ ] Assemble Line (Blackboard integration)
- [ ] Orchestrate Center (deploy, monitoramento)
- [ ] Galeria de Agentes (marketplace interno)
- [ ] Documentação e treinamento

**Entregável:** Sistema completo operacional

---

## 🎯 DECISÕES CRÍTICAS (RESUMO)

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| **MiroFlow** | **EMBUTIR** | Motor científico nativo, benchmarks, verificação multi-camada |
| **OpenClaw** | **EMBUTIR** | Widget interno, detecção contextual no Arcádia |
| **Superset** | **INTEGRAR** | BI visual mantido, bridge para MiroFlow |
| **Skills** | **POO** | Herança, composição, polimorfismo para reuso |
| **Automações** | **UNIFICAR** | Runtime único, múltiplos orquestradores |
| **Dev Center** | **FÁBRICA** | Design → Assemble → Deploy de agentes |
| **Multi-tenant** | **HIERARQUIA** | System → Tenant → Company → User skills |

---

## 📋 PRÓXIMO PASSO

### **Fase 4 Sprint 2: OpenClaw Frontend**
**ETA: 28-29/03/2026**

A Fase 4 Sprint 1 (backend) foi concluída em 26/03. Agora entrar na **Sprint 2 do frontend**, que consiste em:

#### Tarefas Sprint 2:
1. **OpenClawWidget.tsx** — Widget flutuante que:
   - Escuta eventos de sugestões via Socket.IO
   - Mostra notificação "Detectei padrão!"
   - Abre SkillSuggestion modal ao ser clicado

2. **SkillSuggestion.tsx** — Modal que:
   - Exibe padrão detectado (frequência, confiança)
   - Preview do código da skill sugerida (gerado por Blackboard)
   - Botões: Aprovar (→ DRAFT em Dev Center) ou Rejeitar

3. **useAgentEmergence.ts** — Hook que:
   - Conecta a Socket.IO `/api/openclaw` events
   - Gerencia estado de sugestões
   - Sincroniza com OpenClawEngine backend

4. **Integração em App.tsx**:
   - Importar OpenClawWidget
   - Renderizar no layout principal (canto inferior direito)
   - Garantir que não bloqueia interação com página

#### Localização dos arquivos:
```
client/src/
├── components/
│   └── openclaw/
│       ├── OpenClawWidget.tsx      ← NOVO
│       ├── SkillSuggestion.tsx     ← NOVO
│       └── ...
├── hooks/
│   └── useAgentEmergence.ts        ← NOVO
└── App.tsx                          ← MODIFICAR (integração)
```

#### Integração com backend já pronto:
- PatternDetector.ts emite eventos via Socket.IO
- OpenClawEngine.ts orquestra sugestões
- SkillEmergence.ts gera código via Blackboard
- Todas as rotas REST já existem

**Próximo passo após Sprint 2:** Sprint 3 (Config + Testes), depois Fase 5 (Automation Fabric).

---

## 🔗 LINKS ESSENCIAIS

| Recurso | URL |
|---------|-----|
| **MiroFlow Docs** | https://github.com/MiroMindAI/MiroFlow/tree/main/docs |
| **MiroFlow Paper** | https://arxiv.org/abs/2602.22808 |
| **OpenClaw README** | https://github.com/miaoxworld/OpenClawInstaller/blob/main/README.md |
| **Superset Docs** | https://superset.apache.org/docs/intro |
| **Neo4j Docs** | https://neo4j.com/docs/ |
| **Ollama Docs** | https://github.com/ollama/ollama/blob/main/README.md |

---

**Pronto para começar Fase 4 Sprint 2?**
