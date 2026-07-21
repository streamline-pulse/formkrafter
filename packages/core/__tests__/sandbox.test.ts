import { describe, expect, test } from "bun:test";
import { runSandboxed } from "../lib/services/sandbox_interpreter";
import { FetchDataSourceService } from "../lib/services/data_source_service";

describe("FetchDataSourceService", () => {
  test("passes headers and caches per url+headers", async () => {
    const calls: Array<{ url: string; headers?: unknown }> = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string, init?: { headers?: unknown }) => {
      calls.push({ url: String(url), headers: init?.headers });
      return {
        ok: true,
        json: async () => ["A", "B"],
      };
    }) as unknown as typeof fetch;

    try {
      const service = new FetchDataSourceService();
      const withAuth = { headers: { Authorization: "Bearer x" } };

      await service.fetchOptions("/api/opts", withAuth);
      await service.fetchOptions("/api/opts", withAuth);
      await service.fetchOptions("/api/opts");

      expect(calls).toHaveLength(2);
      expect(calls[0].headers).toEqual({ Authorization: "Bearer x" });
      expect(calls[1].headers).toBeUndefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("instance defaults add credentials and base headers", async () => {
    const calls: Array<{ init?: Record<string, unknown> }> = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: string, init?: Record<string, unknown>) => {
      calls.push({ init });
      return { ok: true, json: async () => [] };
    }) as unknown as typeof fetch;

    try {
      const service = new FetchDataSourceService({
        credentials: "include",
        headers: { "X-Tenant": "kora" },
      });

      await service.fetchOptions("/api/opts", {
        headers: { "Accept-Language": "fr" },
      });

      expect(calls[0].init).toEqual({
        headers: { "X-Tenant": "kora", "Accept-Language": "fr" },
        credentials: "include",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("runSandboxed", () => {
  test("evaluates expressions, ternaries and template literals", () => {
    expect(runSandboxed("return 1 + 2 * 3;")).toBe(7);
    expect(runSandboxed("return x > 2 ? 'big' : 'small';", { x: 5 })).toBe("big");
    expect(runSandboxed("return `v=${x}`;", { x: 1 })).toBe("v=1");
  });

  test("supports const, if and optional chaining", () => {
    const code =
      'const value = dataMap?.["code"];\nif (value === undefined) return true;\nreturn value.startsWith("BJ-");';
    expect(runSandboxed(code, { dataMap: {} })).toBe(true);
    expect(runSandboxed(code, { dataMap: { code: "BJ-1" } })).toBe(true);
    expect(runSandboxed(code, { dataMap: { code: "FR-1" } })).toBe(false);
  });

  test("supports arrow functions with array methods", () => {
    expect(
      runSandboxed("return items.filter((i) => i > 2).map((i) => i * 10);", {
        items: [1, 2, 3, 4],
      })
    ).toEqual([30, 40]);
  });

  test("supports object and array literals with spread", () => {
    expect(
      runSandboxed("return { ...base, extra: [...list, 3] };", {
        base: { a: 1 },
        list: [1, 2],
      })
    ).toEqual({ a: 1, extra: [1, 2, 3] });
  });

  test("exposes safe builtins only", () => {
    expect(runSandboxed("return Math.max(1, 5);")).toBe(5);
    expect(runSandboxed("return JSON.stringify({ a: 1 });")).toBe('{"a":1}');
    expect(() => runSandboxed("return globalThis;")).toThrow(
      'Unknown identifier "globalThis"'
    );
    expect(() => runSandboxed("return fetch;")).toThrow(
      'Unknown identifier "fetch"'
    );
  });

  test("blocks prototype escape routes", () => {
    expect(() => runSandboxed('return "".constructor;')).toThrow(
      'Access to "constructor" is not allowed'
    );
    expect(() => runSandboxed("return x.__proto__;", { x: {} })).toThrow(
      'Access to "__proto__" is not allowed'
    );
    expect(() => runSandboxed('return x["prototype"];', { x: {} })).toThrow(
      'Access to "prototype" is not allowed'
    );
  });

  test("rejects unsupported syntax instead of running it", () => {
    expect(() => runSandboxed("while (true) {}")).toThrow(
      "Unsupported syntax: WhileStatement"
    );
    expect(() => runSandboxed("return new Date();")).toThrow(
      "Unsupported syntax: NewExpression"
    );
  });

  test("runaway recursion fails instead of hanging", () => {
    expect(() =>
      runSandboxed("const f = (n) => f(n + 1); return f(0);")
    ).toThrow();
  });
});
