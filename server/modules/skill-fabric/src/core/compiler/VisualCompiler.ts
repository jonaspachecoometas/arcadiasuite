// server/modules/skill-fabric/src/core/compiler/VisualCompiler.ts
// Compiles visual node-graph skill definitions into a Markdown body
// Visual canvas is a stretch goal — this stub handles the future format

import type { CompileInput, CompileResult } from "../../types";

export interface VisualNode {
  id: string;
  type: "trigger" | "step" | "condition" | "output";
  label: string;
  config?: Record<string, unknown>;
  next?: string[]; // node ids
}

export interface VisualGraph {
  nodes: VisualNode[];
  edges: Array<{ from: string; to: string }>;
}

export class VisualCompiler {
  compile(input: CompileInput): CompileResult {
    const { source } = input;

    if (!source || source.trim().length === 0) {
      return { ok: false, errors: [{ message: "Grafo visual não pode estar vazio", severity: "error" }] };
    }

    let graph: VisualGraph;
    try {
      graph = JSON.parse(source) as VisualGraph;
    } catch {
      return { ok: false, errors: [{ message: "Grafo visual inválido — esperado JSON", severity: "error" }] };
    }

    if (!graph.nodes || graph.nodes.length === 0) {
      return { ok: false, errors: [{ message: "Grafo visual deve ter pelo menos um nó", severity: "error" }] };
    }

    // Convert visual graph to Markdown body
    const body = this.graphToMarkdown(graph);

    return {
      ok: true,
      body,
      errors: [],
      warnings: ["Modo visual está em fase experimental"],
      metadata: { mode: "visual", nodeCount: graph.nodes.length },
    };
  }

  private graphToMarkdown(graph: VisualGraph): string {
    const lines: string[] = ["# Skill Visual\n"];

    const trigger = graph.nodes.find((n) => n.type === "trigger");
    if (trigger) {
      lines.push(`## Gatilho: ${trigger.label}\n`);
    }

    const steps = graph.nodes.filter((n) => n.type === "step");
    if (steps.length > 0) {
      lines.push("## Passos\n");
      for (const step of steps) {
        lines.push(`- ${step.label}`);
        if (step.config) {
          for (const [k, v] of Object.entries(step.config)) {
            lines.push(`  - ${k}: ${String(v)}`);
          }
        }
      }
    }

    const outputs = graph.nodes.filter((n) => n.type === "output");
    if (outputs.length > 0) {
      lines.push("\n## Saída\n");
      for (const out of outputs) {
        lines.push(`- ${out.label}`);
      }
    }

    return lines.join("\n");
  }
}

export const visualCompiler = new VisualCompiler();
