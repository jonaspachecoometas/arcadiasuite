import type { Express } from "express";
import skillsRouter from "../skills/routes";
import openclawRouter from "./openclaw/routes";

export async function loadModuleRoutes(app: Express): Promise<void> {
  app.use("/api/skills", skillsRouter);
  app.use("/api/openclaw", openclawRouter);
}
