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

describe("runSandboxed hardening", () => {
  const ESCAPE_PREFIX =
    'const F = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(() => 1), "constructor").value;';

  test("cannot reach the Function constructor through builtins", () => {
    expect(() =>
      runSandboxed(
        `${ESCAPE_PREFIX} return F.bind(null, "return typeof process")()();`
      )
    ).toThrow();
    expect(() => runSandboxed("return Object.getPrototypeOf({});")).toThrow(
      '"getPrototypeOf" is not a function'
    );
    expect(() => runSandboxed("return Reflect;")).toThrow(
      'Unknown identifier "Reflect"'
    );
  });

  test("cannot call or read host function methods", () => {
    expect(() => runSandboxed("const f = () => 1; return f.bind(null)();")).toThrow(
      '"bind" is not an allowed method'
    );
    expect(() => runSandboxed("const f = () => 1; return f.call;")).toThrow(
      'Reading the function "call" is not allowed'
    );
    expect(() => runSandboxed('return "x".anchor("y");')).toThrow(
      '"anchor" is not an allowed method'
    );
    expect(() => runSandboxed('const r = "x".repeat; return [1].map(r);')).toThrow(
      'Reading the function "repeat" is not allowed'
    );
  });

  test("cannot pollute host prototypes", () => {
    expect(() =>
      runSandboxed(
        'Object.assign(Object.getPrototypeOf({}), { polluted: "yes" }); return 1;'
      )
    ).toThrow();
    expect(() =>
      runSandboxed('return Object.fromEntries([["__proto__", { polluted: 1 }]]);')
    ).toThrow('Access to "__proto__" is not allowed');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  test("objects cannot define conversion hooks", () => {
    expect(() =>
      runSandboxed('return String({ toString: () => "x".repeat(10) });')
    ).toThrow('Access to "toString" is not allowed');
    expect(() =>
      runSandboxed('return JSON.parse(\'{"a":1}\', (k, v) => v);')
    ).not.toThrow();
  });

  test("host data is read-only, rule-created arrays are not", () => {
    const list = [3, 1, 2];
    expect(() => runSandboxed("list.push(4); return list;", { list })).toThrow(
      "Only arrays created by the rule can be modified"
    );
    expect(() => runSandboxed("return list.sort();", { list })).toThrow();
    expect(list).toEqual([3, 1, 2]);
    expect(runSandboxed("const copy = [...list]; copy.sort(); return copy;", { list })).toEqual([1, 2, 3]);
    expect(runSandboxed("const out = list.map((x) => x * 2); out.push(0); return out;", { list })).toEqual([6, 2, 4, 0]);
  });

  test("amplifying natives are size-capped before they allocate", () => {
    expect(() => runSandboxed('return "x".repeat(1e8).length;')).toThrow(
      "Sandbox size limit exceeded"
    );
    expect(() => runSandboxed('return "".padStart(1e9);')).toThrow(
      "Sandbox size limit exceeded"
    );
    expect(() =>
      runSandboxed('return Array.from({ length: 1e9 }).length;')
    ).toThrow("Sandbox size limit exceeded");
    expect(() =>
      runSandboxed(
        'const a = "x".repeat(1000); const b = [a, a, a, a, a, a, a, a, a, a]; return b.join(a.repeat(1000)).length;'
      )
    ).toThrow("Sandbox size limit exceeded");
    expect(() =>
      runSandboxed('const a = "x".repeat(500000); return (a + a + a).length;')
    ).toThrow("Sandbox size limit exceeded");
  });

  test("repeated native work exhausts the budget", () => {
    expect(() =>
      runSandboxed(
        'const s = "x".repeat(900000); const big = [s, s, s, s, s, s, s, s, s, s]; return big.map((x) => x.indexOf("y")).length;'
      )
    ).toThrow("Sandbox execution budget exceeded");
    expect(() =>
      runSandboxed(
        "const a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; const b = a.map(() => a); const c = b.map(() => b); const d = c.map(() => c); const e = d.map(() => d); return e.flat(Infinity).length;"
      )
    ).toThrow("Sandbox size limit exceeded");
  });

  test("budget is shared across nested calls", () => {
    expect(() =>
      runSandboxed(
        "const f = (n) => n === 0 ? 0 : f(n - 1) + f(n - 1); return f(30);"
      )
    ).toThrow("Sandbox execution budget exceeded");
    expect(() =>
      runSandboxed("const f = (n) => f(n + 1); return f(0);")
    ).toThrow("Sandbox call depth exceeded");
  });

  test("rejects BigInt literals", () => {
    expect(() => runSandboxed("return 2n ** 100000000n;")).toThrow(
      "BigInt literals are not supported"
    );
  });

  test("everyday rule code still works", () => {
    const dataMap = { email: "a@b.co", items: [{ qty: 2, price: 5 }, { qty: 1, price: 3 }], code: " bj-12 " };
    expect(runSandboxed("return /^[^@]+@[^@]+$/.test(dataMap.email);", { dataMap })).toBe(true);
    expect(runSandboxed("return dataMap.items.reduce((sum, i) => sum + i.qty * i.price, 0);", { dataMap })).toBe(13);
    expect(runSandboxed("return dataMap.code.trim().toUpperCase().replace(/-/g, '');", { dataMap })).toBe("BJ12");
    expect(runSandboxed("return Object.keys(dataMap).length;", { dataMap })).toBe(3);
    expect(runSandboxed("return [1, 2, 3].map(String).join('|');")).toBe("1|2|3");
    expect(runSandboxed("return ['1', '', '3'].filter(Boolean).map(Number);")).toEqual([1, 3]);
    expect(runSandboxed("return Math.round(Number('2.6')) + parseInt('4', 10);")).toBe(7);
    expect(runSandboxed("return JSON.stringify({ a: [1, 2] }, null, 2).length;")).toBeGreaterThan(10);
    expect(typeof runSandboxed("return Date.now();")).toBe("number");
    expect(runSandboxed("return helper(2);", { helper: (n: number) => n * 3 })).toBe(6);
    expect(runSandboxed("return 'a-b'.replace(/-/g, (m) => '_');")).toBe("a_b");
  });
});

test("evalBrickCode exposes the form values as dataMap", async () => {
  const { evalBrickCode } = await import("../lib/brick/utils");
  expect(evalBrickCode("return dataMap.qty * 2;", { qty: 21 })).toBe(42);
});
