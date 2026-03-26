# Fase 4: OpenClaw Embutido — Plano de Implementação

**Fase:** 4
**Data Início:** 2026-03-26
**Prazo:** 2026-04-08 (Semanas 7-8)
**Status:** 🔄 Em Planejamento

---

## 1. OBJETIVO DA FASE

Implementar **detecção proativa de padrões** e **sugestão emergente de skills**, transformando comportamentos repetitivos do usuário em automações reutilizáveis através de um widget conversacional flutuante.

### Entregável Final
✅ Skills emergentes funcionando end-to-end:
- Usuário executa ação repetida → PatternDetector detecta → OpenClawWidget sugere → Blackboard gera DRAFT → Dev Center aprova → Skill disponível

---

## 2. ARQUITETURA

```
FLUXO OPENCCLAW:

1. USER INTERACTION
   └─ Usuário usa Arcádia
   └─ Learning API registra evento (já existe)
   └─ Neo4j armazena interação

2. PATTERN DETECTION (NOVO)
   └─ PatternDetector analisa Learning API
   └─ Identifica: 3+ ocorrências em 30 dias
   └─ Calcula confiança (threshold 0.8+)
   └─ Dispara evento no Socket.IO

3. WIDGET SUGGESTION (NOVO)
   └─ OpenClawWidget fica "ouvindo"
   └─ Recebe evento de padrão detectado
   └─ Exibe notificação flutuante
   └─ Modal SkillSuggestion mostra preview

4. SKILL GENERATION (NOVO)
   └─ Usuário confirma
   └─ OpenClawEngine chama Blackboard
   └─ Blackboard gera código (DRAFT)
   └─ Armazena em database

5. APPROVAL FLOW (EXISTENTE - Dev Center)
   └─ Skill DRAFT aparece em Dev Center
   └─ Admin/Lead revisa e aprova
   └─ Publica no tenant
   └─ Skill fica disponível para reutilização
```

### Componentes para Implementar

```
BACKEND:
server/modules/openclaw/
├── PatternDetector.ts         ← [NOVO] Detecta padrões
├── SkillEmergence.ts          ← [NOVO] Coordena criação
├── OpenClawEngine.ts          ← [NOVO] Lógica central
├── config/
│   └── arcadia.config.yaml    ← [NOVO] Configuração

FRONTEND:
client/src/components/openclaw/
├── OpenClawWidget.tsx         ← [NOVO] Widget flutuante
├── PatternDetector.ts         ← [NOVO] Hook de detecção
├── SkillSuggestion.tsx        ← [NOVO] Modal de sugestão
└── useAgentEmergence.ts       ← [NOVO] Lógica de emergência
```

---

## 3. DEPENDÊNCIAS VERIFICADAS

| Componente | Status | Localização |
|-----------|--------|-----------|
| **Skills Engine** | ✅ Pronto | `server/skills/engine.ts` |
| **Blackboard** | ✅ Pronto | `server/blackboard/service.ts` |
| **Dev Center** | ✅ Pronto | `client/src/pages/DevCenter.tsx` |
| **Learning API** | ✅ Existe | `/api/learning/*` |
| **Neo4j (KG)** | ✅ Running | Docker |
| **Socket.IO** | ✅ Configurado | `server/socket-io.ts` |
| **PostgreSQL** | ✅ Rodando | Docker |
| **Scientist (MiroFlow)** | ✅ Existe | `/api/manus/scientist/*` |

**Conclusão:** Todas as dependências estão prontas ✅

---

## 4. TASKS DETALHADAS

### SPRINT 1 (26-27/03): PatternDetector Backend

#### Task 1.1: Criar PatternDetector.ts
**Arquivo:** `server/modules/openclaw/PatternDetector.ts`
**Objetivo:** Analisar eventos de usuário e detectar padrões

```typescript
// Pseudocódigo da estrutura
export class PatternDetector {
  // Config
  min_occurrences: 3;
  time_window_days: 30;
  confidence_threshold: 0.8;

  // Métodos
  detectPattern(userId: string, action: string): Pattern | null
  calculateConfidence(interactions: Interaction[]): number
  storePattern(pattern: Pattern): Promise<void>
  emitEvent(pattern: Pattern): void
}
```

**Entrada:** Eventos do Learning API (`/api/learning/interactions`)
**Saída:** Pattern objects armazenados em Neo4j + Socket.IO event
**Dependência:** Learning API funcionando ✅

#### Task 1.2: Criar OpenClawEngine.ts
**Arquivo:** `server/modules/openclaw/OpenClawEngine.ts`
**Objetivo:** Orquestração central de OpenClaw

```typescript
export class OpenClawEngine {
  patternDetector: PatternDetector;
  skillEmergence: SkillEmergence;

  // Métodos
  async suggestSkill(pattern: Pattern): Promise<SkillSuggestion>
  async onUserConfirmation(suggestion: SkillSuggestion): Promise<Skill>
  async checkPatternsPeriodicly(): Promise<void>
}
```

**Entrada:** Padrões detectados
**Saída:** Sugestões + Skills gerados
**Evento:** Socket.IO broadcast `/openclaw/pattern-detected`

#### Task 1.3: Criar SkillEmergence.ts
**Arquivo:** `server/modules/openclaw/SkillEmergence.ts`
**Objetivo:** Integração com Blackboard para codegen

```typescript
export class SkillEmergence {
  async generateSkillDraft(pattern: Pattern): Promise<SkillDraft> {
    // 1. Montar prompt baseado no padrão
    // 2. Chamar POST /api/blackboard/generate-skill
    // 3. Receber código gerado
    // 4. Salvar como DRAFT no database
    // 5. Notificar Dev Center
    // 6. Retornar skill DRAFT
  }
}
```

**Integração:** POST `/api/blackboard/generate-skill`
**Database:** skills table (com status: 'draft')

#### Task 1.4: Criar rotas OpenClaw
**Arquivo:** `server/modules/openclaw/routes.ts`
**Rotas:**
```
POST /api/openclaw/detect-patterns         ← Trigger manual de análise
GET  /api/openclaw/patterns                ← Listar padrões detectados
POST /api/openclaw/confirm-skill           ← Usuário confirma sugestão
GET  /api/openclaw/suggestions             ← Histórico de sugestões
```

#### Task 1.5: Integrar em server/index.ts
**Arquivo:** `server/index.ts`
**Ação:** Importar rotas OpenClaw e carregá-las

```typescript
import openclawRoutes from "./modules/openclaw/routes";
app.use("/api/openclaw", openclawRoutes);
```

### SPRINT 2 (28-29/03): Frontend Widgets

#### Task 2.1: Criar OpenClawWidget.tsx
**Arquivo:** `client/src/components/openclaw/OpenClawWidget.tsx`
**Objetivo:** Widget flutuante que recebe notificações de padrões

```typescript
export function OpenClawWidget() {
  // Escutar Socket.IO event: /openclaw/pattern-detected
  // Exibir notificação flutuante (canto inferior direito)
  // Mostrar padrão detectado
  // Botão "Ver Sugestão" abre modal
  // Botão "Ignorar" descarta

  return (
    <div className="fixed bottom-4 right-4">
      {/* Widget flutuante */}
    </div>
  );
}
```

**Socket.IO:** Escuta evento `/openclaw/pattern-detected`
**Trigger:** Modal SkillSuggestion

#### Task 2.2: Criar SkillSuggestion.tsx
**Arquivo:** `client/src/components/openclaw/SkillSuggestion.tsx`
**Objetivo:** Modal com preview da skill sugerida

```typescript
export function SkillSuggestion({ pattern, suggestion }) {
  // Modal mostra:
  // 1. "Detectamos um padrão na sua utilização:"
  // 2. Preview do padrão (ações repetidas)
  // 3. Preview da automação gerada
  // 4. Campo de nome (auto-preenchido)
  // 5. Descrição (auto-gerada)
  // 6. Botão "Criar Skill" ou "Cancelar"

  const handleCreate = async () => {
    // POST /api/openclaw/confirm-skill
    // Esperar resposta (skill DRAFT)
    // Toast: "Skill criada! Vá para Dev Center para publicar"
  };
}
```

**Integração:** Chama `POST /api/openclaw/confirm-skill`
**Feedback:** Toast notification

#### Task 2.3: Hook useAgentEmergence.ts
**Arquivo:** `client/src/hooks/useAgentEmergence.ts`
**Objetivo:** Lógica de emergência de agentes

```typescript
export function useAgentEmergence(userId: string) {
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    // Socket.IO listener
    socket.on("openclaw:pattern-detected", (pattern) => {
      // Filtrar por tenant, user prefs
      // Atualizar suggestions state
      setSuggestions([...suggestions, pattern]);
    });
  }, []);

  return { suggestions, dismiss, confirm };
}
```

#### Task 2.4: Integrar Widget em layout principal
**Arquivo:** `client/src/App.tsx` ou `client/src/layouts/MainLayout.tsx`
**Ação:** Adicionar OpenClawWidget ao layout persistente

```typescript
import { OpenClawWidget } from "@/components/openclaw/OpenClawWidget";

export default function App() {
  return (
    <>
      {/* Conteúdo existente */}
      <OpenClawWidget />  {/* ← Adicionar aqui */}
    </>
  );
}
```

### SPRINT 3 (30-31/03): Configuração e Integração

#### Task 3.1: Criar arcadia.config.yaml
**Arquivo:** `server/modules/openclaw/config/arcadia.config.yaml`

```yaml
openclaw:
  enabled: true

  # Endpoints
  arcadia_api_url: http://localhost:3000/api
  arcadia_kg_url: http://localhost:7474
  blackboard_url: http://localhost:3000/api/blackboard

  # Tenant awareness
  tenant_aware: true

  # Detecção de padrões
  pattern_detection:
    enabled: true
    min_occurrences: 3
    time_window_days: 30
    confidence_threshold: 0.8
    scheduled_check_interval_minutes: 60

  # Sugestões
  suggestions:
    enabled: true
    auto_suggest: false          # Sempre pedir confirmação do usuário
    channels: ['widget', 'chat']
    priority_threshold: 0.85

  # Skills emergentes
  emergence:
    create_as_draft: true        # Sempre requer aprovação
    auto_publish: false
    notify_admins: true
    skill_prefix: "emergent_"    # Prefixo para skills auto-geradas

  # Logging
  logging:
    enabled: true
    store_patterns: true
    store_in_kg: true
    audit_trail: true
```

#### Task 3.2: Integrar Socket.IO events
**Arquivo:** `server/socket-io.ts`
**Ação:** Adicionar listeners e emitters para OpenClaw

```typescript
socket.on("openclaw:confirm-skill", async (data) => {
  // Receber confirmação do usuário
  // Chamar SkillEmergence.generateSkillDraft()
  // Emitir "openclaw:skill-created"
});

// Emitter no PatternDetector
io.emit("openclaw:pattern-detected", pattern);
```

#### Task 3.3: Database schema para OpenClaw
**Arquivo:** `shared/schema.ts` (Drizzle ORM)
**Adicionar tabelas:**

```typescript
// Padrões detectados
export const detectedPatterns = pgTable("detected_patterns", {
  id: serial().primaryKey(),
  tenant_id: uuid().notNull(),
  user_id: uuid().notNull(),
  action_type: varchar(255).notNull(),
  occurrences: integer().notNull(),
  confidence: numeric(3, 2).notNull(),
  time_window_days: integer().notNull(),
  created_at: timestamp().defaultNow(),
  metadata: jsonb(),
});

// Sugestões geradas
export const skillSuggestions = pgTable("skill_suggestions", {
  id: serial().primaryKey(),
  pattern_id: integer().references(() => detectedPatterns.id),
  skill_draft_id: uuid().references(() => skills.id),
  status: varchar(50).notNull(), // 'suggested', 'accepted', 'rejected'
  created_at: timestamp().defaultNow(),
});
```

#### Task 3.4: Migration SQL
**Arquivo:** `migrations/0004_openclaw_tables.sql`

```sql
CREATE TABLE detected_patterns (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action_type VARCHAR(255) NOT NULL,
  occurrences INTEGER NOT NULL,
  confidence NUMERIC(3,2) NOT NULL,
  time_window_days INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

CREATE TABLE skill_suggestions (
  id SERIAL PRIMARY KEY,
  pattern_id INTEGER REFERENCES detected_patterns(id),
  skill_draft_id UUID REFERENCES skills(id),
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_detected_patterns_user_tenant
  ON detected_patterns(user_id, tenant_id);
```

#### Task 3.5: Testes unitários
**Arquivo:** `tests/openclaw.test.ts`
- PatternDetector detecta padrão corretamente
- OpenClawEngine orquestra fluxo correto
- SkillEmergence integra com Blackboard
- Socket.IO emite eventos corretamente

#### Task 3.6: Documentação
**Arquivo:** `DOCUMENTATION.md` (adicionar seção)
- Como OpenClaw funciona
- Configuração por tenant
- Troubleshooting

---

## 5. TIMELINE

| Data | Sprint | Tasks | Status |
|------|--------|-------|--------|
| 26-27/03 | 1 | PatternDetector backend | ⏳ Próximo |
| 28-29/03 | 2 | OpenClawWidget frontend | ⏳ Próximo |
| 30-31/03 | 3 | Configuração + testes | ⏳ Próximo |
| 01-08/04 | Buffer | Refinamento, testes E2E | ⏳ Próximo |

---

## 6. CRITÉRIOS DE SUCESSO

✅ **PatternDetector funciona:**
- Detecta padrão após 3 ocorrências em 30 dias
- Confiança calculada corretamente
- Eventos emitidos para Socket.IO

✅ **OpenClawWidget funciona:**
- Widget aparece quando padrão é detectado
- Modal mostra sugestão corretamente
- Usuário pode confirmar ou rejeitar

✅ **SkillEmergence funciona:**
- Integra com Blackboard
- Gera skill como DRAFT
- Aparece em Dev Center para aprovação

✅ **E2E funciona:**
- User faz ação 3x
- Widget sugere
- Approva
- Skill publicada
- Skill disponível para reutilização

---

## 7. RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| Blackboard não retorna código correto | Média | Testar integração antes, ter fallback |
| Padrões detectados incorretamente | Média | Validar threshold, testes no KG |
| Socket.IO não emite em tempo real | Baixa | Já funciona em outras partes |
| Performance com muitos eventos | Média | Usar índices em PG, cache em Redis |

---

## 8. BRANCH E COMMITS

**Branch:** `Servidor` (deploy branch, conforme feedback anterior)
**Commit pattern:**
```
feat(openclaw): PatternDetector backend
feat(openclaw): OpenClawWidget frontend
feat(openclaw): Integração Blackboard + esquema DB
docs(openclaw): Documentação e testes
```

---

## 9. PRÓXIMAS AÇÕES

1. ✅ **Hoje (26/03):** Aprovar este plano
2. ⏳ **Amanhã (27/03):** Começar Task 1.1 (PatternDetector.ts)
3. ⏳ **28/03:** Começar Sprint 2 (Frontend)
4. ⏳ **30/03:** Sprint 3 (Config + testes)
5. ⏳ **01/04:** Refinamento e E2E tests

---

*Fase 4: OpenClaw Embutido — Plano Executável*
*Data: 2026-03-26*
*Pronto para implementação ✅*
