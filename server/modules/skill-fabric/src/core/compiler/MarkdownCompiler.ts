// server/modules/skill-fabric/src/core/compiler/MarkdownCompiler.ts
// Validates and processes Markdown skill bodies (with optional YAML frontmatter)

import type { CompileInput, CompileResult, CompileError } from "../../types";

export class MarkdownCompiler {
  compile(input: CompileInput): CompileResult {
    const { source } = input;
    const errors: CompileError[] = [];
    const warnings: string[] = [];

    if (!source || source.trim().length === 0) {
      errors.push({ message: "Corpo Markdown não pode estar vazio", severity: "error" });
      return { ok: false, errors };
    }

    // Parse optional YAML frontmatter
    let body = source;
    let metadata: Record<string, unknown> = { mode: "markdown" };

    if (source.startsWith("---")) {
      const frontmatterResult = this.parseFrontmatter(source);
      if (frontmatterResult.error) {
        errors.push({ message: `Erro no frontmatter YAML: ${frontmatterResult.error}`, severity: "error" });
        return { ok: false, errors };
      }
      body = frontmatterResult.body;
      metadata = { ...metadata, frontmatter: frontmatterResult.data };
    }

    // Check for empty body after frontmatter stripping
    if (body.trim().length === 0) {
      warnings.push("Corpo Markdown está vazio após o frontmatter — adicione instruções");
    }

    // Validate template references format: {{parameters.x}}, {{/var/x}}
    const invalidRefs = this.findInvalidReferences(body);
    for (const ref of invalidRefs) {
      errors.push({ message: `Referência de template inválida: ${ref}`, severity: "error" });
    }

    if (errors.some((e) => e.severity === "error")) {
      return { ok: false, errors, warnings };
    }

    // Count lines and detect structure
    const lines = body.split("\n");
    const headings = lines.filter((l) => l.startsWith("#")).length;
    if (headings === 0) {
      warnings.push("Nenhum título (# Heading) encontrado — considere estruturar com headings");
    }

    metadata.linesOfContent = lines.length;
    metadata.headingsCount = headings;

    return { ok: true, body: source, errors: [], warnings, metadata };
  }

  private parseFrontmatter(source: string): { data: Record<string, unknown>; body: string; error?: string } {
    const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match) {
      return { data: {}, body: source, error: "Frontmatter malformado — certifique-se de fechar com '---'" };
    }

    const yamlText = match[1];
    const body = match[2] ?? "";
    const data: Record<string, unknown> = {};

    // Simple YAML key: value parser (covers common cases)
    try {
      for (const line of yamlText.split("\n")) {
        const colonIdx = line.indexOf(":");
        if (colonIdx === -1) continue;
        const key = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();
        if (key) {
          // Detect arrays: value starts with [ or subsequent lines start with -
          if (value.startsWith("[") && value.endsWith("]")) {
            data[key] = value
              .slice(1, -1)
              .split(",")
              .map((s) => s.trim().replace(/^["']|["']$/g, ""));
          } else {
            data[key] = value.replace(/^["']|["']$/g, "");
          }
        }
      }
    } catch (err) {
      return { data: {}, body, error: String(err) };
    }

    return { data, body };
  }

  private findInvalidReferences(body: string): string[] {
    const invalid: string[] = [];
    // Find {{ ... }} patterns and validate them
    const pattern = /\{\{([^}]+)\}\}/g;
    let m: RegExpExecArray | null;

    while ((m = pattern.exec(body)) !== null) {
      const inner = m[1].trim();
      const validPatterns = [
        /^parameters\.\w+(\.\w+)*$/,
        /^\/var\/[\w/]+(\.\w+)*$/,
        /^\/skill[\w/]*$/,
        /^\w+$/, // simple variable name
      ];
      if (!validPatterns.some((p) => p.test(inner))) {
        invalid.push(m[0]);
      }
    }

    return invalid;
  }
}

export const markdownCompiler = new MarkdownCompiler();
