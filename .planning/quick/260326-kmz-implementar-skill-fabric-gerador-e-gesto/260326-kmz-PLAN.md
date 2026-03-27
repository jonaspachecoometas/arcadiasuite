# Quick Task 260326-kmz: Implementar Skill Fabric

**Description:** Implementar Skill Fabric — gerador e gestor de skills da Arcádia Suite
**Date:** 2026-03-26
**Mode:** quick

---

## Task 1: Backend — Skill Fabric Module

**Files:**
- `server/modules/skill-fabric/src/types/index.ts`
- `server/modules/skill-fabric/src/core/skill/Skill.entity.ts`
- `server/modules/skill-fabric/src/core/compiler/VisualCompiler.ts`
- `server/modules/skill-fabric/src/core/compiler/CodeCompiler.ts`
- `server/modules/skill-fabric/src/core/compiler/MarkdownCompiler.ts`
- `server/modules/skill-fabric/src/core/validator/ValidationPipeline.ts`
- `server/modules/skill-fabric/src/core/executor/SkillExecutor.ts`
- `server/modules/skill-fabric/src/core/executor/Sandbox.ts`
- `server/modules/skill-fabric/src/core/lifecycle/LifecycleManager.ts`
- `server/modules/skill-fabric/src/api/routes/skills.routes.ts`
- `server/modules/skill-fabric/src/api/controllers/skills.controller.ts`
- `server/modules/skill-fabric/index.ts`

**Action:** Create the full backend Skill Fabric module with types, entity, compilers, validator pipeline, executor/sandbox, lifecycle manager, and API routes. The project uses TypeScript + Express + Drizzle ORM. Reuse existing `db` and `skills` schema from `../../shared/schema`. No new DB migration needed — extend existing skills table logic.

**Context:**
- Existing `server/skills/routes.ts` has basic CRUD. The new module adds compilation, validation, execution, versioning, lifecycle.
- DB import: `import { db } from "@/db"` or `import { db } from "../../../db"` — check what works
- Existing schema: `skills`, `skillExecutions` from `../../shared/schema`
- Do NOT use vm2 (needs install) — use Node.js built-in `vm` module for sandbox
- Do NOT use ReactFlow/Monaco yet (frontend task) — backend only here

**Done:** Files created, module compiles without errors

---

## Task 2: Frontend — Skill Fabric UI

**Files:**
- `client/src/modules/skill-fabric/index.ts`
- `client/src/modules/skill-fabric/types.ts`
- `client/src/modules/skill-fabric/api.ts`
- `client/src/modules/skill-fabric/code-ide/components/SkillCodeEditor.tsx`
- `client/src/modules/skill-fabric/markdown-studio/components/MarkdownEditor.tsx`
- `client/src/modules/skill-fabric/shared/components/SkillToolbar.tsx`
- `client/src/modules/skill-fabric/shared/components/VersionSelector.tsx`
- `client/src/modules/skill-fabric/shared/components/ValidationPanel.tsx`
- `client/src/pages/SkillFabricPage.tsx`

**Action:** Create frontend Skill Fabric module. Use textarea-based code editor (Monaco not installed — don't add it). Use Tailwind CSS + shadcn/ui components matching the existing project style. Create a SkillFabricPage that lists skills, allows creating/editing (code + markdown modes), compiling, validating, and executing. Wire to the backend API routes from Task 1.

**Context:**
- Check `client/src/components/` for existing UI patterns (shadcn components available)
- Check `client/src/App.tsx` to see how routes are registered — add the new page there
- The visual canvas (ReactFlow) is a stretch goal — skip it, implement code + markdown modes only
- API base: `/api/skills` (existing) + `/api/skill-fabric` (new from Task 1)

**Done:** SkillFabricPage renders, skills can be listed and created

---

## Task 3: Register Routes & Integration

**Files:**
- `server/modules/loader.ts`
- `client/src/App.tsx` (or router file)

**Action:** Register the new skill-fabric backend routes in `server/modules/loader.ts`. Add the SkillFabricPage route in the frontend router. Verify existing skills route still works.

**Done:** `/api/skill-fabric/*` routes registered, frontend page accessible
