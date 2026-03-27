# Phase 4 Context — OpenClaw Embutido

> Generated in --auto mode on 2026-03-26. All decisions auto-selected with recommended defaults.

## Phase Goal

Skills emergentes criadas automaticamente a partir de padrões detectados em `skill_executions`.

## Prior Context Applied

- **Stack de IA:** Ollama local via LiteLLM — usar `llama3.1:8b` para geração de drafts (leve, rápido)
- **Backend-first:** API definida antes do frontend
- **Auditoria imutável:** todas as execuções registradas com SHA-256
- **Schema já existe:** `detected_patterns` e `skill_suggestions` em `shared/schema.ts` — usar sem alterar

---

## Decisions

### 1. O que constitui um "padrão"?

**[auto] Mesma skill executada ≥3 vezes em 30 dias com confiança ≥80%**

- Fonte de dados: tabela `skill_executions`
- Agrupamento: `skillId + userId` (por usuário, não global)
- Confiança calculada como: `(frequency / max_frequency_in_window) * 100`
- Janela: `lastSeenAt - firstSeenAt ≤ 30 dias`
- Thresholds alinhados com o roadmap: min 3 ocorrências, 30 dias, 80% confiança

### 2. Trigger do PatternDetector

**[auto] Cron job a cada hora (setInterval no servidor Node.js)**

- Sem dependência de infraestrutura externa (sem Redis, sem Bull)
- Ao iniciar, PatternDetector registra no startup do servidor
- Execuções recentes analisadas em lote; padrões gravados em `detected_patterns`
- Se padrão já existe (mesmo skillId + userId): atualiza frequency + lastSeenAt

### 3. Geração do body da skill emergente

**[auto] AI via llama3.1:8b (LiteLLM) gera o body do DRAFT**

- Ao atingir threshold: PatternDetector cria entrada em `skill_suggestions` (status: `pending`)
- Skill DRAFT gerada automaticamente em `arcadia_skills` (status: `draft`, source: `openclaw`)
- Body gerado via prompt para llama3.1:8b descrevendo o padrão detectado
- DRAFT aguarda aprovação — não é executável até ser `published`

### 4. Widget de notificação

**[auto] Badge no header global + painel slide-in**

- Badge no ícone de notificações existente no header (sem criar novo componente de header)
- Ao clicar: slide-in panel lateral mostrando lista de sugestões pendentes
- Cada sugestão mostra: nome sugerido, padrão detectado, frequência, confiança, body preview
- Ações inline: "Aceitar" → promove para skill publicada | "Rejeitar" → status `rejected`

### 5. Aprovação — onde?

**[auto] Tab "Sugestões" em `/skills` (página existente) — Dev Center completo na Phase 6**

- Sem criar nova rota — adicionar tab na página `/skills` já existente
- Tab lista `skill_suggestions` com status `pending`
- Fluxo: aceitar → cria skill publicada a partir do DRAFT | rejeitar → arquiva sugestão
- Dev Center completo (Phase 6) herdará esse fluxo

---

## Reusable Assets Identified

- `shared/schema.ts` — `detectedPatterns`, `skillSuggestions` já definidos (Phase 1)
- `server/skills/engine.ts` — SkillEngine para criar DRAFT skills programaticamente
- `server/skills/routes.ts` — rota `/api/skills` existente, adicionar sub-rotas de sugestões
- `server/skills/versioning.ts` — SHA-256 audit logging (reusar padrão)
- `client/src/pages/BiWorkspace.tsx` — referência de como adicionar tabs a uma página existente
- `docker/litellm-config.yaml` — llama3.1:8b já configurado como Tier 2

---

## Scope Boundary

**Incluído nesta fase:**
- PatternDetector backend (cron + análise de skill_executions)
- Geração de DRAFT via AI
- Widget de notificação + slide-in
- Tab "Sugestões" em /skills com aprovação/rejeição

**Fora de escopo (phases futuras):**
- Dev Center completo (Phase 6)
- Detecção de padrões em outras fontes além de skill_executions
- Pattern sharing entre tenants

---

## Plan Breakdown Suggested

- **04-01:** PatternDetector service (backend) — cron, análise, gravação em detected_patterns + skill_suggestions + DRAFT creation via AI
- **04-02:** API routes + frontend widget (badge + slide-in) + tab "Sugestões" em /skills
