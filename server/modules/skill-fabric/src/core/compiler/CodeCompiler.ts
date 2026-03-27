// server/modules/skill-fabric/src/core/compiler/CodeCompiler.ts
// Compiles JavaScript/TypeScript-like skill code, validates syntax

import type { CompileInput, CompileResult, CompileError } from "../../types";

export class CodeCompiler {
  compile(input: CompileInput): CompileResult {
    const { source } = input;
    const errors: CompileError[] = [];
    const warnings: string[] = [];

    if (!source || source.trim().length === 0) {
      errors.push({ message: "Código não pode estar vazio", severity: "error", field: "source" } as CompileError & { field: string });
      return { ok: false, errors };
    }

    // Basic syntax checks
    const syntaxErrors = this.checkSyntax(source);
    errors.push(...syntaxErrors);

    if (syntaxErrors.some((e) => e.severity === "error")) {
      return { ok: false, errors, warnings };
    }

    // Prepend //code marker so SkillEntity can detect the mode
    const body = source.trimStart().startsWith("//code") ? source : `//code\n${source}`;

    // Warn if no return statement
    if (!source.includes("return ")) {
      warnings.push("Nenhuma instrução 'return' encontrada — a skill não retornará dados");
    }

    return {
      ok: true,
      body,
      errors: [],
      warnings,
      metadata: { mode: "code", linesOfCode: source.split("\n").length },
    };
  }

  private checkSyntax(source: string): CompileError[] {
    const errors: CompileError[] = [];

    // Check balanced braces
    let braces = 0;
    let parens = 0;
    const lines = source.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const ch of line) {
        if (ch === "{") braces++;
        if (ch === "}") braces--;
        if (ch === "(") parens++;
        if (ch === ")") parens--;
      }

      if (braces < 0) {
        errors.push({ line: i + 1, message: "Chave de fechamento sem abertura correspondente", severity: "error" });
        braces = 0;
      }
      if (parens < 0) {
        errors.push({ line: i + 1, message: "Parêntese de fechamento sem abertura correspondente", severity: "error" });
        parens = 0;
      }
    }

    if (braces > 0) {
      errors.push({ message: `${braces} chave(s) de abertura sem fechamento`, severity: "error" });
    }
    if (parens > 0) {
      errors.push({ message: `${parens} parêntese(s) de abertura sem fechamento`, severity: "error" });
    }

    // Detect obviously dangerous patterns (Rule 2: security)
    const forbidden = [
      { pattern: /require\s*\(/, msg: "require() não permitido em skills — use os helpers disponíveis no contexto" },
      { pattern: /process\.exit/, msg: "process.exit() não permitido em skills" },
      { pattern: /child_process/, msg: "child_process não permitido em skills" },
      { pattern: /fs\./, msg: "Acesso direto ao filesystem não permitido em skills" },
    ];

    for (const { pattern, msg } of forbidden) {
      if (pattern.test(source)) {
        errors.push({ message: msg, severity: "error" });
      }
    }

    return errors;
  }
}

export const codeCompiler = new CodeCompiler();
