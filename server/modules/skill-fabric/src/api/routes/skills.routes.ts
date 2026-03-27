// server/modules/skill-fabric/src/api/routes/skills.routes.ts
// Skill Fabric API routes

import { Router } from "express";
import {
  listSkills,
  getSkill,
  createSkill,
  updateSkill,
  compileSkill,
  publishSkill,
  archiveSkill,
  bumpVersion,
  executeSkill,
  getExecutions,
} from "../controllers/skills.controller";

const router = Router();

// ── CRUD ───────────────────────────────────────────────────────────────────────
router.get("/", listSkills);
router.get("/:id", getSkill);
router.post("/", createSkill);
router.put("/:id", updateSkill);

// ── Compilation ────────────────────────────────────────────────────────────────
router.post("/compile", compileSkill);

// ── Lifecycle ─────────────────────────────────────────────────────────────────
router.post("/:id/publish", publishSkill);
router.post("/:id/archive", archiveSkill);
router.post("/:id/bump-version", bumpVersion);

// ── Execution ─────────────────────────────────────────────────────────────────
router.post("/:id/execute", executeSkill);
router.get("/:id/executions", getExecutions);

export default router;
