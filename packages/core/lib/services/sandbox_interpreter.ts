import { parse } from "acorn";

interface AstNode {
  type: string;
  [key: string]: unknown;
}

// Security model
// --------------
// Rule code is parsed with Acorn and walked node by node; only the node types
// handled in `evalNode` run. Host objects are never handed to rule code raw:
//   - builtins are frozen, prototype-less facades exposing an allowlist of
//     functions (no `Object.getPrototypeOf`, `defineProperty`, `assign`, ...);
//   - methods are called only from per-type allowlists, looked up on the real
//     prototype (`"x".repeat` works, `fn.bind` or `"x".anchor` do not);
//   - a host function can be called or passed around only if it is a sandbox
//     arrow, an allowlisted builtin, or a top-level function the host passed in
//     `globals`. Reading any other function value throws;
//   - arrays the rule did not create are read-only;
//   - work done inside native calls (string building, coercions, copies) is
//     charged to the same budget as interpreted steps, and string/array results
//     are size-capped, with worst-case checks before amplifying calls run.
// Known gap: a regular expression literal can still backtrack catastrophically
// inside the native regex engine, which no budget can interrupt.

const FORBIDDEN_PROPS = new Set(["__proto__", "constructor", "prototype"]);
// Keys that would let an object run rule code during a native coercion.
const FORBIDDEN_KEYS = new Set([
  ...FORBIDDEN_PROPS,
  "toString",
  "toLocaleString",
  "valueOf",
  "toJSON",
]);

const MAX_STEPS = 100_000;
// Native work units (characters, elements) that cost one step.
const WORK_PER_STEP = 100;
const MAX_CALL_DEPTH = 256;
export const MAX_SANDBOX_STRING_LENGTH = 1_000_000;
export const MAX_SANDBOX_ARRAY_LENGTH = 100_000;

class ReturnSignal {
  constructor(readonly value: unknown) {}
}

type Scope = Map<string, unknown>;
type AnyFn = (...args: unknown[]) => unknown;

interface Budget {
  steps: number;
  depth: number;
}

interface Ctx {
  budget: Budget;
  scopes: Scope[];
  hostFns: WeakSet<object>;
  owned: WeakSet<object>;
}

interface NativeSpec {
  fn: AnyFn;
  /** returns a fresh array the rule may mutate */
  fresh?: boolean;
  /** mutates `this`: only allowed on arrays the rule created */
  mutates?: boolean;
  /** converts the elements of `this` to strings */
  coerces?: boolean;
  /** worst-case output size, checked before the call */
  estimate?: (self: unknown, args: unknown[], ctx: Ctx) => number;
  /** wraps callbacks whose results the native concatenates */
  wrapArgs?: (ctx: Ctx, args: unknown[]) => unknown[];
}

const sandboxFunctions = new WeakSet<object>();
const trusted = new Map<unknown, NativeSpec>();
const facades = new WeakSet<object>();

const budgetError = () => new Error("Sandbox execution budget exceeded");
const sizeError = () => new Error("Sandbox size limit exceeded");

const tick = (ctx: Ctx, steps = 1): void => {
  ctx.budget.steps += steps;
  if (ctx.budget.steps > MAX_STEPS) throw budgetError();
};

const charge = (ctx: Ctx, units: number): void => {
  if (units > 0) tick(ctx, Math.ceil(units / WORK_PER_STEP));
};

const checkSize = (value: unknown): void => {
  if (typeof value === "string" && value.length > MAX_SANDBOX_STRING_LENGTH) {
    throw sizeError();
  }
  if (Array.isArray(value) && value.length > MAX_SANDBOX_ARRAY_LENGTH) {
    throw sizeError();
  }
};

const checkEstimate = (estimate: number): number => {
  if (!(estimate <= MAX_SANDBOX_STRING_LENGTH)) throw sizeError();
  return estimate;
};

/**
 * Upper bound of the work a native does to read or stringify `value`, counting
 * every occurrence of shared references. Throws as soon as it exceeds what is
 * left of the budget, so measuring is itself bounded.
 */
const measure = (ctx: Ctx, value: unknown, indent = 0): number => {
  const limit = (MAX_STEPS - ctx.budget.steps) * WORK_PER_STEP;
  const stack = new Set<object>();
  let total = 0;

  const visit = (item: unknown, depth: number): void => {
    if (total > limit) throw budgetError();
    const pad = depth * indent;
    if (typeof item === "string") {
      total += item.length + 2 + pad;
      return;
    }
    if (typeof item === "function") {
      total += 1024 + pad;
      return;
    }
    if (item === null || typeof item !== "object") {
      total += 8 + pad;
      return;
    }
    if (stack.has(item)) return;
    stack.add(item);
    if (item instanceof RegExp) {
      total += item.source.length + 8 + pad;
    } else if (Array.isArray(item)) {
      total += 2 + item.length + pad;
      for (const element of item) visit(element, depth + 1);
    } else {
      total += 16 + pad;
      for (const key of Object.keys(item)) {
        total += key.length + 4;
        visit((item as Record<string, unknown>)[key], depth + 1);
      }
    }
    stack.delete(item);
  };

  visit(value, 0);
  if (total > limit) throw budgetError();
  return total;
};

const shallowSize = (value: unknown): number => {
  if (typeof value === "string" || Array.isArray(value)) return value.length + 1;
  return 1;
};

/** Cost of an operator applied to `value`: strings and coerced objects. */
const operandCost = (ctx: Ctx, value: unknown, coerces: boolean): number => {
  if (typeof value === "string") return value.length;
  if (coerces && value !== null && typeof value === "object") {
    return measure(ctx, value);
  }
  return 0;
};

const isCallable = (ctx: Ctx, fn: unknown): fn is AnyFn =>
  typeof fn === "function" &&
  (sandboxFunctions.has(fn) || trusted.has(fn) || ctx.hostFns.has(fn));

const callNative = (
  ctx: Ctx,
  spec: NativeSpec,
  self: unknown,
  args: unknown[]
): unknown => {
  for (const arg of args) {
    if (typeof arg === "function" && !isCallable(ctx, arg)) {
      throw new Error("This function is not allowed");
    }
  }
  if (spec.mutates && !(Array.isArray(self) && ctx.owned.has(self))) {
    throw new Error(
      "Only arrays created by the rule can be modified; copy it first (e.g. [...list])"
    );
  }

  let units = 1 + (spec.coerces ? measure(ctx, self) : shallowSize(self));
  for (const arg of args) units += measure(ctx, arg);
  if (spec.estimate) units += checkEstimate(spec.estimate(self, args, ctx));
  charge(ctx, units);

  const callArgs = spec.wrapArgs ? spec.wrapArgs(ctx, args) : args;
  // Reflect.apply: callable facades have a null prototype, hence no `.apply`.
  const result = Reflect.apply(spec.fn, self, callArgs);

  checkSize(result);
  if (Array.isArray(self)) checkSize(self);
  if (spec.fresh && Array.isArray(result)) ctx.owned.add(result);
  if (result !== self) charge(ctx, shallowSize(result));

  return result;
};

const callFunction = (ctx: Ctx, fn: unknown, args: unknown[]): unknown => {
  if (typeof fn === "function" && sandboxFunctions.has(fn)) {
    return (fn as AnyFn)(...args);
  }
  const spec = trusted.get(fn);
  if (spec) return callNative(ctx, spec, undefined, args);
  if (typeof fn === "function" && ctx.hostFns.has(fn)) {
    return callNative(ctx, { fn: fn as AnyFn }, undefined, args);
  }
  throw new Error("This function is not allowed");
};

const trust = <F extends AnyFn>(fn: F, spec: Omit<NativeSpec, "fn"> = {}): F => {
  trusted.set(fn, { fn, ...spec });
  return fn;
};

const facade = <T extends object>(base: T, members: Record<string, unknown>): T => {
  for (const [key, value] of Object.entries(members)) {
    Object.defineProperty(base, key, { value, enumerable: true });
  }
  Object.setPrototypeOf(base, null);
  facades.add(base);
  return Object.freeze(base);
};

const toCount = (value: unknown): number => {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const jsonIndent = (space: unknown): number => {
  if (typeof space === "number") return Math.min(10, toCount(space));
  if (typeof space === "string") return Math.min(10, space.length);
  return 0;
};

const mathMembers: Record<string, unknown> = {};
for (const key of Object.getOwnPropertyNames(Math)) {
  const value = (Math as unknown as Record<string, unknown>)[key];
  mathMembers[key] = typeof value === "function" ? trust(value as AnyFn) : value;
}

const SANDBOX_MATH = facade({}, mathMembers);

const SANDBOX_JSON = facade(
  {},
  {
    // No reviver / function replacer: their results would be spliced into the
    // output by the native without any size accounting.
    parse: trust((text: unknown) => JSON.parse(String(text)), { fresh: true }),
    stringify: trust(
      (value: unknown, replacer?: unknown, space?: unknown) =>
        JSON.stringify(
          value,
          Array.isArray(replacer) ? (replacer as string[]) : undefined,
          space as string | number | undefined
        ),
      {
        estimate: (_self, [value, , space], ctx) =>
          measure(ctx, value, jsonIndent(space) + 1),
      }
    ),
  }
);

const SANDBOX_OBJECT = facade(
  {},
  {
    keys: trust(Object.keys as AnyFn, { fresh: true }),
    values: trust(Object.values as AnyFn, { fresh: true }),
    entries: trust(Object.entries as AnyFn, { fresh: true }),
    fromEntries: trust((entries: unknown) => {
      if (!Array.isArray(entries)) throw new Error("Object.fromEntries expects an array");
      const result: Record<string, unknown> = {};
      for (const entry of entries) {
        const [key, value] = Array.isArray(entry) ? entry : [];
        result[guardKey(String(key))] = value;
      }
      return result;
    }),
  }
);

const arrayLikeLength = (source: unknown): number => {
  if (typeof source === "string" || Array.isArray(source)) return source.length;
  if (source === null || source === undefined) return 0;
  const length = Number((source as { length?: unknown }).length);
  if (!Number.isFinite(length) || length < 0) return 0;
  return Math.trunc(length);
};

const SANDBOX_ARRAY = facade(
  {},
  {
    isArray: trust(Array.isArray as AnyFn),
    of: trust(Array.of as AnyFn, { fresh: true }),
    from: trust(
      (source: unknown, mapFn?: unknown) => {
        if (arrayLikeLength(source) > MAX_SANDBOX_ARRAY_LENGTH) throw sizeError();
        return mapFn === undefined
          ? Array.from(source as ArrayLike<unknown>)
          : Array.from(source as ArrayLike<unknown>, mapFn as AnyFn);
      },
      { fresh: true }
    ),
  }
);

const SANDBOX_NUMBER = facade(
  trust((...args: unknown[]) => (args.length ? Number(args[0]) : 0)),
  {
    isFinite: trust(Number.isFinite as AnyFn),
    isInteger: trust(Number.isInteger as AnyFn),
    isNaN: trust(Number.isNaN as AnyFn),
    isSafeInteger: trust(Number.isSafeInteger as AnyFn),
    parseFloat: trust(Number.parseFloat as AnyFn),
    parseInt: trust(Number.parseInt as AnyFn),
    MAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
    MIN_SAFE_INTEGER: Number.MIN_SAFE_INTEGER,
    MAX_VALUE: Number.MAX_VALUE,
    MIN_VALUE: Number.MIN_VALUE,
    EPSILON: Number.EPSILON,
    POSITIVE_INFINITY: Number.POSITIVE_INFINITY,
    NEGATIVE_INFINITY: Number.NEGATIVE_INFINITY,
    NaN: Number.NaN,
  }
);

const SANDBOX_STRING = facade(
  trust((...args: unknown[]) => (args.length ? String(args[0]) : "")),
  {
    fromCharCode: trust(String.fromCharCode as AnyFn),
    fromCodePoint: trust(String.fromCodePoint as AnyFn),
  }
);

const SANDBOX_BOOLEAN = facade(
  trust((value: unknown) => Boolean(value)),
  {}
);

const SANDBOX_DATE = facade(
  {},
  {
    now: trust(Date.now as AnyFn),
    parse: trust(Date.parse as AnyFn),
    UTC: trust(Date.UTC as AnyFn),
  }
);

const SAFE_BUILTINS: Record<string, unknown> = {
  undefined,
  NaN,
  Infinity,
  Math: SANDBOX_MATH,
  JSON: SANDBOX_JSON,
  Number: SANDBOX_NUMBER,
  String: SANDBOX_STRING,
  Boolean: SANDBOX_BOOLEAN,
  Array: SANDBOX_ARRAY,
  Object: SANDBOX_OBJECT,
  Date: SANDBOX_DATE,
  parseInt: trust(parseInt as AnyFn),
  parseFloat: trust(parseFloat as AnyFn),
  isNaN: trust(isNaN as AnyFn),
  isFinite: trust(isFinite as AnyFn),
};

const methodTable = (
  proto: object,
  names: string[],
  extra: Record<string, Omit<NativeSpec, "fn">> = {}
): Map<string, NativeSpec> => {
  const table = new Map<string, NativeSpec>();
  for (const name of names) {
    const fn = (proto as Record<string, unknown>)[name];
    if (typeof fn === "function") table.set(name, { fn: fn as AnyFn, ...extra[name] });
  }
  return table;
};

/** Wraps a callback so the total size of what it returns stays bounded. */
const boundedCallback =
  (index: number, sizeOf: (value: unknown) => number, limit: number) =>
  (ctx: Ctx, args: unknown[]): unknown[] => {
    const callback = args[index];
    if (typeof callback !== "function") return args;
    let total = 0;
    const wrapped = (...callArgs: unknown[]) => {
      const value = (callback as AnyFn)(...callArgs);
      const size = sizeOf(value);
      total += size;
      if (total > limit) throw sizeError();
      charge(ctx, size);
      return value;
    };
    const copy = [...args];
    copy[index] = wrapped;
    return copy;
  };

const replaceSpec: Omit<NativeSpec, "fn"> = {
  estimate: (self, [, replacement]) => {
    if (typeof replacement === "function") return 0;
    const length = String(self).length;
    const r = String(replacement).length;
    // every match may be replaced, and each `$&`/`$n` re-inserts matched text
    return length * (1 + r + r / 2) + r;
  },
  wrapArgs: boundedCallback(
    1,
    (value) => String(value).length,
    MAX_SANDBOX_STRING_LENGTH
  ),
};

const STRING_METHODS = methodTable(
  String.prototype,
  [
    "at", "charAt", "charCodeAt", "codePointAt", "concat", "endsWith",
    "includes", "indexOf", "lastIndexOf", "localeCompare", "match",
    "normalize", "padEnd", "padStart", "repeat", "replace", "replaceAll",
    "search", "slice", "split", "startsWith", "substring", "substr",
    "toLowerCase", "toUpperCase", "toLocaleLowerCase", "toLocaleUpperCase",
    "trim", "trimStart", "trimEnd", "toString", "valueOf",
  ],
  {
    match: { fresh: true },
    split: { fresh: true },
    repeat: { estimate: (self, [count]) => String(self).length * toCount(count) },
    padStart: { estimate: (_self, [target]) => toCount(target) },
    padEnd: { estimate: (_self, [target]) => toCount(target) },
    replace: replaceSpec,
    replaceAll: replaceSpec,
  }
);

const NUMBER_METHODS = methodTable(Number.prototype, [
  "toFixed", "toPrecision", "toExponential", "toString", "toLocaleString", "valueOf",
]);

const BOOLEAN_METHODS = methodTable(Boolean.prototype, ["toString", "valueOf"]);

const REGEXP_METHODS = methodTable(RegExp.prototype, ["test", "exec", "toString"], {
  exec: { fresh: true },
});

const countFlat = (array: unknown[], depth: number): number => {
  let count = 0;
  const walk = (items: unknown[], level: number): void => {
    for (const item of items) {
      if (++count > MAX_SANDBOX_ARRAY_LENGTH) throw sizeError();
      if (Array.isArray(item) && level > 0) walk(item, level - 1);
    }
  };
  walk(array, depth);
  return count;
};

const ARRAY_METHODS = methodTable(
  Array.prototype,
  [
    "at", "concat", "every", "filter", "find", "findIndex", "findLast",
    "findLastIndex", "flat", "flatMap", "forEach", "includes", "indexOf",
    "join", "lastIndexOf", "map", "reduce", "reduceRight", "slice", "some",
    "toReversed", "toSorted", "toSpliced", "with", "toString", "toLocaleString",
    "push", "pop", "shift", "unshift", "splice", "sort", "reverse", "fill",
  ],
  {
    concat: { fresh: true },
    filter: { fresh: true },
    map: { fresh: true },
    slice: { fresh: true },
    toReversed: { fresh: true },
    toSorted: { fresh: true, coerces: true },
    toSpliced: { fresh: true },
    with: { fresh: true },
    flat: {
      fresh: true,
      estimate: (self, [depth]) =>
        countFlat(self as unknown[], depth === undefined ? 1 : Number(depth) || 0),
    },
    flatMap: {
      fresh: true,
      wrapArgs: boundedCallback(
        0,
        (value) => (Array.isArray(value) ? value.length : 1),
        MAX_SANDBOX_ARRAY_LENGTH
      ),
    },
    join: {
      coerces: true,
      estimate: (self, [separator]) =>
        (self as unknown[]).length *
        (separator === undefined ? 1 : String(separator).length),
    },
    toString: { coerces: true },
    toLocaleString: { coerces: true },
    push: { mutates: true },
    pop: { mutates: true },
    shift: { mutates: true },
    unshift: { mutates: true },
    splice: { mutates: true, fresh: true },
    sort: { mutates: true, coerces: true },
    reverse: { mutates: true },
    fill: { mutates: true },
  }
);

const methodFor = (object: unknown, prop: string | number): NativeSpec | undefined => {
  const name = String(prop);
  if (typeof object === "string") return STRING_METHODS.get(name);
  if (typeof object === "number") return NUMBER_METHODS.get(name);
  if (typeof object === "boolean") return BOOLEAN_METHODS.get(name);
  if (Array.isArray(object)) return ARRAY_METHODS.get(name);
  if (object instanceof RegExp) return REGEXP_METHODS.get(name);
  return undefined;
};

const lookup = (ctx: Ctx, name: string): unknown => {
  for (let i = ctx.scopes.length - 1; i >= 0; i--) {
    if (ctx.scopes[i].has(name)) return ctx.scopes[i].get(name);
  }

  throw new Error(`Unknown identifier "${name}"`);
};

const declareVar = (ctx: Ctx, name: string, value: unknown): void => {
  ctx.scopes[ctx.scopes.length - 1].set(name, value);
};

const assign = (ctx: Ctx, name: string, value: unknown): void => {
  for (let i = ctx.scopes.length - 1; i >= 0; i--) {
    if (ctx.scopes[i].has(name)) {
      ctx.scopes[i].set(name, value);
      return;
    }
  }

  throw new Error(`Cannot assign to unknown identifier "${name}"`);
};

const guardName = (name: string, forbidden: Set<string>): string => {
  if (forbidden.has(name)) {
    throw new Error(`Access to "${name}" is not allowed`);
  }
  return name;
};

const guardKey = (name: string): string => guardName(name, FORBIDDEN_KEYS);

const guardProp = (ctx: Ctx, prop: unknown): string | number => {
  if (typeof prop === "number") return prop;
  charge(ctx, operandCost(ctx, prop, true));
  return guardName(String(prop), FORBIDDEN_PROPS);
};

const memberTarget = (
  ctx: Ctx,
  node: AstNode
): { object: unknown; prop: string | number; optional: boolean } => {
  const object = evalNode(ctx, node.object as AstNode);
  const prop = node.computed
    ? guardProp(ctx, evalNode(ctx, node.property as AstNode))
    : guardProp(ctx, (node.property as AstNode).name);

  return { object, prop, optional: node.optional === true };
};

const readMember = (ctx: Ctx, node: AstNode): unknown => {
  const { object, prop, optional } = memberTarget(ctx, node);

  if (object === null || object === undefined) {
    if (optional) return undefined;
    throw new Error(`Cannot read "${String(prop)}" of ${String(object)}`);
  }

  const value = (object as Record<string | number, unknown>)[prop];
  if (typeof value === "function" && !isCallable(ctx, value)) {
    throw new Error(`Reading the function "${String(prop)}" is not allowed; call it directly`);
  }
  return value;
};

const evalArguments = (ctx: Ctx, nodes: AstNode[]): unknown[] => {
  const args: unknown[] = [];
  for (const argument of nodes) {
    if (argument.type === "SpreadElement") {
      const spread = evalNode(ctx, argument.argument as AstNode);
      if (Array.isArray(spread)) {
        charge(ctx, spread.length);
        args.push(...spread);
        checkSize(args);
      }
    } else {
      args.push(evalNode(ctx, argument));
    }
  }
  return args;
};

const callMember = (ctx: Ctx, node: AstNode, callee: AstNode, args: unknown[]): unknown => {
  const { object, prop, optional } = memberTarget(ctx, callee);
  if (object === null || object === undefined) {
    if (optional || node.optional === true) return undefined;
    throw new Error(`Cannot call "${String(prop)}" of ${String(object)}`);
  }

  if (typeof object === "object" || typeof object === "function") {
    if (facades.has(object)) {
      const fn = (object as Record<string | number, unknown>)[prop];
      if (fn === undefined && node.optional === true) return undefined;
      const spec = trusted.get(fn);
      if (!spec) throw new Error(`"${String(prop)}" is not a function`);
      return callNative(ctx, spec, undefined, args);
    }
  }

  const method = methodFor(object, prop);
  if (method) return callNative(ctx, method, object, args);

  const fn = (object as Record<string | number, unknown>)[prop];
  if (typeof fn !== "function") {
    if (node.optional === true && fn == null) return undefined;
    throw new Error(`"${String(prop)}" is not a function`);
  }
  if (!isCallable(ctx, fn)) {
    throw new Error(`"${String(prop)}" is not an allowed method`);
  }
  return callFunction(ctx, fn, args);
};

const evalNode = (ctx: Ctx, node: AstNode): unknown => {
  tick(ctx);

  switch (node.type) {
    case "Program":
    case "BlockStatement": {
      for (const statement of node.body as AstNode[]) {
        const result = evalNode(ctx, statement);
        if (result instanceof ReturnSignal) return result;
      }
      return undefined;
    }
    case "ReturnStatement":
      return new ReturnSignal(
        node.argument ? evalNode(ctx, node.argument as AstNode) : undefined
      );
    case "IfStatement": {
      if (evalNode(ctx, node.test as AstNode)) {
        return evalNode(ctx, node.consequent as AstNode);
      }
      if (node.alternate) return evalNode(ctx, node.alternate as AstNode);
      return undefined;
    }
    case "VariableDeclaration": {
      for (const declaration of node.declarations as AstNode[]) {
        const id = declaration.id as AstNode;
        if (id.type !== "Identifier") {
          throw new Error("Only simple variable names are supported");
        }
        declareVar(
          ctx,
          id.name as string,
          declaration.init ? evalNode(ctx, declaration.init as AstNode) : undefined
        );
      }
      return undefined;
    }
    case "ExpressionStatement":
      evalNode(ctx, node.expression as AstNode);
      return undefined;
    case "Literal":
      if (node.bigint !== undefined) {
        throw new Error("BigInt literals are not supported");
      }
      return node.value;
    case "TemplateLiteral": {
      const quasis = node.quasis as AstNode[];
      const expressions = node.expressions as AstNode[];
      let text = "";
      quasis.forEach((quasi, index) => {
        text += (quasi.value as { cooked?: string }).cooked ?? "";
        if (index < expressions.length) {
          const value = evalNode(ctx, expressions[index]);
          charge(ctx, operandCost(ctx, value, true));
          text += String(value);
          checkSize(text);
        }
      });
      return text;
    }
    case "Identifier":
      return lookup(ctx, node.name as string);
    case "ThisExpression":
      return undefined;
    case "ChainExpression":
      return evalNode(ctx, node.expression as AstNode);
    case "MemberExpression":
      return readMember(ctx, node);
    case "CallExpression": {
      const callee = node.callee as AstNode;
      const args = evalArguments(ctx, node.arguments as AstNode[]);

      if (callee.type === "MemberExpression") {
        return callMember(ctx, node, callee, args);
      }

      const fn = evalNode(ctx, callee);
      if (typeof fn !== "function") {
        if (node.optional === true && fn == null) return undefined;
        throw new Error("Value is not a function");
      }
      return callFunction(ctx, fn, args);
    }
    case "ArrowFunctionExpression": {
      if (node.async === true || node.generator === true) {
        throw new Error("Unsupported syntax: async arrow function");
      }
      const params = node.params as AstNode[];
      const body = node.body as AstNode;
      const capturedScopes = [...ctx.scopes];

      const fn = (...args: unknown[]): unknown => {
        const budget = ctx.budget;
        if (budget.depth >= MAX_CALL_DEPTH) {
          throw new Error("Sandbox call depth exceeded");
        }
        budget.depth++;
        try {
          const callScope: Scope = new Map();
          params.forEach((param, index) => {
            if (param.type !== "Identifier") {
              throw new Error("Only simple parameters are supported");
            }
            callScope.set(param.name as string, args[index]);
          });

          const result = evalNode(
            { ...ctx, scopes: [...capturedScopes, callScope] },
            body
          );

          if (result instanceof ReturnSignal) return result.value;
          return node.expression === true ? result : undefined;
        } finally {
          budget.depth--;
        }
      };

      sandboxFunctions.add(fn);
      return fn;
    }
    case "BinaryExpression": {
      const left = evalNode(ctx, node.left as AstNode) as never;
      const right = evalNode(ctx, node.right as AstNode) as never;
      const coerces = node.operator !== "===" && node.operator !== "!==";
      charge(
        ctx,
        operandCost(ctx, left, coerces) + operandCost(ctx, right, coerces)
      );
      switch (node.operator) {
        case "===": return left === right;
        case "!==": return left !== right;
        case "==": return left == right;
        case "!=": return left != right;
        case "<": return left < right;
        case "<=": return left <= right;
        case ">": return left > right;
        case ">=": return left >= right;
        case "+": {
          const sum = (left as number) + (right as number);
          checkSize(sum);
          return sum;
        }
        case "-": return (left as number) - (right as number);
        case "*": return (left as number) * (right as number);
        case "/": return (left as number) / (right as number);
        case "%": return (left as number) % (right as number);
        case "**": return (left as number) ** (right as number);
        default:
          throw new Error(`Unsupported operator "${String(node.operator)}"`);
      }
    }
    case "LogicalExpression": {
      const left = evalNode(ctx, node.left as AstNode);
      switch (node.operator) {
        case "&&": return left && evalNode(ctx, node.right as AstNode);
        case "||": return left || evalNode(ctx, node.right as AstNode);
        case "??": return left ?? evalNode(ctx, node.right as AstNode);
        default:
          throw new Error(`Unsupported operator "${String(node.operator)}"`);
      }
    }
    case "UnaryExpression": {
      const argument = evalNode(ctx, node.argument as AstNode);
      switch (node.operator) {
        case "!": return !argument;
        case "-":
          charge(ctx, operandCost(ctx, argument, true));
          return -(argument as number);
        case "+":
          charge(ctx, operandCost(ctx, argument, true));
          return +(argument as number);
        case "typeof": return typeof argument;
        default:
          throw new Error(`Unsupported operator "${String(node.operator)}"`);
      }
    }
    case "ConditionalExpression":
      return evalNode(ctx, node.test as AstNode)
        ? evalNode(ctx, node.consequent as AstNode)
        : evalNode(ctx, node.alternate as AstNode);
    case "AssignmentExpression": {
      const target = node.left as AstNode;
      if (target.type !== "Identifier" || node.operator !== "=") {
        throw new Error("Only simple assignments are supported");
      }
      const value = evalNode(ctx, node.right as AstNode);
      assign(ctx, target.name as string, value);
      return value;
    }
    case "ArrayExpression": {
      const values: unknown[] = [];
      for (const element of node.elements as Array<AstNode | null>) {
        if (!element) continue;
        if (element.type === "SpreadElement") {
          const spread = evalNode(ctx, element.argument as AstNode);
          if (Array.isArray(spread)) {
            charge(ctx, spread.length);
            values.push(...spread);
            checkSize(values);
          }
        } else {
          values.push(evalNode(ctx, element));
        }
      }
      ctx.owned.add(values);
      return values;
    }
    case "ObjectExpression": {
      const result: Record<string, unknown> = {};
      for (const property of node.properties as AstNode[]) {
        if (property.type === "SpreadElement") {
          const spread = evalNode(ctx, property.argument as AstNode);
          if (spread && typeof spread === "object") {
            const entries = Object.entries(spread);
            charge(ctx, entries.length);
            for (const [key, value] of entries) {
              result[guardKey(key)] = value;
            }
          }
          continue;
        }

        const keyNode = property.key as AstNode;
        const key = property.computed
          ? guardProp(ctx, evalNode(ctx, keyNode))
          : keyNode.type === "Identifier"
            ? (keyNode.name as string)
            : String(keyNode.value);
        result[guardKey(String(key))] = evalNode(ctx, property.value as AstNode);
      }
      return result;
    }
    default:
      throw new Error(`Unsupported syntax: ${node.type}`);
  }
};

export function runSandboxed(
  code: string,
  globals: Record<string, unknown> = {}
): unknown {
  const ast = parse(code, {
    ecmaVersion: "latest",
    allowReturnOutsideFunction: true,
  }) as unknown as AstNode;

  const hostFns = new WeakSet<object>();
  for (const value of Object.values(globals)) {
    if (typeof value === "function") hostFns.add(value);
  }

  const ctx: Ctx = {
    budget: { steps: 0, depth: 0 },
    scopes: [
      new Map(Object.entries({ ...SAFE_BUILTINS, ...globals })),
      new Map(),
    ],
    hostFns,
    owned: new WeakSet(),
  };

  const result = evalNode(ctx, ast);
  return result instanceof ReturnSignal ? result.value : undefined;
}
