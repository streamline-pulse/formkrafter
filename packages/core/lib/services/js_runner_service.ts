import { type Options, parse } from "acorn";
import { runSandboxed } from "./sandbox_interpreter";

export interface JsValidationResult {
  valid: boolean;
  error?: Error;
}

export interface JsRunnerService {
  eval(js: string, scope?: Record<string, unknown>): unknown;
  validateJs(js: string, options?: Options): JsValidationResult;
}

export class SandboxJsRunnerService implements JsRunnerService {
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
    return runSandboxed(js, scope);
  }
}

export const JsRunnerServiceImplementation = SandboxJsRunnerService;
