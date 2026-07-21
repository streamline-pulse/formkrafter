import { type Options, parse } from "acorn";

export interface JsRunnerService {
  eval(js: string): unknown;
  validateJs(js: string, options?: Options): { valide: boolean; error?: Error };
}

export class JsRunnerServiceImplementation implements JsRunnerService {
  validateJs(
    js: string,
    options: Options = { ecmaVersion: "latest" }
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
  eval(js: string): unknown {
    const fn = `(() => {${js}})();`;
    const fnValidation = this.validateJs(fn);
    if (fnValidation.valide === true) {
      return eval(fn);
    } else {
      throw fnValidation.error;
    }
  }
}
