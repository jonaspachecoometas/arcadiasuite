// server/modules/skill-fabric/src/core/executor/Sandbox.ts
// Safe code execution using Node.js built-in vm module (NOT vm2)

import vm from "vm";
import type { SandboxOptions, SandboxResult } from "../../types";

const DEFAULT_TIMEOUT_MS = 5000;

export class Sandbox {
  run(opts: SandboxOptions): SandboxResult {
    const logs: string[] = [];
    const timeout = opts.timeout ?? DEFAULT_TIMEOUT_MS;

    // Build a safe context — only expose what we explicitly allow
    const context: Record<string, unknown> = {
      // Safe console (captures logs instead of printing them)
      console: {
        log: (...args: unknown[]) => logs.push(args.map(String).join(" ")),
        warn: (...args: unknown[]) => logs.push("[warn] " + args.map(String).join(" ")),
        error: (...args: unknown[]) => logs.push("[error] " + args.map(String).join(" ")),
      },
      // Safe Math, Date, JSON
      Math,
      Date,
      JSON,
      // Utility helpers
      String,
      Number,
      Boolean,
      Array,
      Object,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURIComponent,
      decodeURIComponent,
      // User-provided context variables
      ...(opts.context ?? {}),
    };

    vm.createContext(context);

    try {
      // Wrap code in an async IIFE so top-level await is possible
      const wrappedCode = `
(async function __skill__() {
${opts.code}
})()
`;
      const script = new vm.Script(wrappedCode, { filename: "skill.js" });
      const result = script.runInContext(context, { timeout }) as Promise<unknown> | unknown;

      // Handle both sync and async execution
      if (result instanceof Promise) {
        // For async, we use a synchronous trick via vm timers
        // Since vm doesn't natively support Promise.resolve waiting without event loop,
        // we return the promise wrapped result as "pending" — caller should use runAsync
        return { ok: true, value: "[async — use runAsync]", logs };
      }

      return { ok: true, value: result, logs };
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      logs.push("[error] " + error);
      return { ok: false, error, logs };
    }
  }

  /** Async-safe version that properly awaits the result */
  async runAsync(opts: SandboxOptions): Promise<SandboxResult> {
    const logs: string[] = [];
    const timeout = opts.timeout ?? DEFAULT_TIMEOUT_MS;

    const context: Record<string, unknown> = {
      console: {
        log: (...args: unknown[]) => logs.push(args.map(String).join(" ")),
        warn: (...args: unknown[]) => logs.push("[warn] " + args.map(String).join(" ")),
        error: (...args: unknown[]) => logs.push("[error] " + args.map(String).join(" ")),
      },
      Math,
      Date,
      JSON,
      String,
      Number,
      Boolean,
      Array,
      Object,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURIComponent,
      decodeURIComponent,
      Promise,
      ...(opts.context ?? {}),
    };

    vm.createContext(context);

    const wrappedCode = `
(async function __skill__() {
${opts.code}
})()
`;

    try {
      const script = new vm.Script(wrappedCode, { filename: "skill.js" });

      // Run the script (returns a Promise from the IIFE)
      const promise = script.runInContext(context) as Promise<unknown>;

      // Race against timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout: execução excedeu ${timeout}ms`)), timeout)
      );

      const value = await Promise.race([promise, timeoutPromise]);
      return { ok: true, value, logs };
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      logs.push("[error] " + error);
      return { ok: false, error, logs };
    }
  }
}

export const sandbox = new Sandbox();
