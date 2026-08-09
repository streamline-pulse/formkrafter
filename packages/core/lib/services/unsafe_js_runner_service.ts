import { type Options, parse } from "acorn";
import type { JsRunnerService, JsValidationResult } from "./js_runner_service";

export class UnsafeEvalJsRunnerService implements JsRunnerService {
  validateJs(
    js: string,
    options: Options = { ecmaVersion: "latest", allowReturnOutsideFunction: true }
  ): JsValidationResult {
    try {
      parse(js, options);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  eval(js: string, scope: Record<string, unknown> = {}): unknown {
    const prelude = Object.entries(scope)
      .map(([name, value]) => `const ${name} = ${JSON.stringify(value)};`)
      .join("\n");
    const fn = `(() => {${prelude}\n${js}})();`;

    const validation = this.validateJs(fn, { ecmaVersion: "latest" });
    if (!validation.valid) throw validation.error;

    return eval(fn);
  }
}
