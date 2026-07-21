import { type Options, parse } from "acorn";
import type { JsRunnerService } from "./js_runner_service";

export class UnsafeEvalJsRunnerService implements JsRunnerService {
  validateJs(
    js: string,
    options: Options = { ecmaVersion: "latest", allowReturnOutsideFunction: true }
  ): { valide: boolean; error?: Error } {
    try {
      parse(js, options);
      return { valide: true };
    } catch (error) {
      return {
        valide: false,
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
    if (!validation.valide) throw validation.error;

    return eval(fn);
  }
}
