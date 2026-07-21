import { parse } from "acorn";

interface AstNode {
  type: string;
  [key: string]: unknown;
}

const FORBIDDEN_PROPS = new Set(["__proto__", "constructor", "prototype"]);
const MAX_STEPS = 100_000;

class ReturnSignal {
  constructor(readonly value: unknown) {}
}

type Scope = Map<string, unknown>;

interface Ctx {
  steps: number;
  scopes: Scope[];
}

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

const guardProp = (prop: unknown): string | number => {
  if (typeof prop === "number") return prop;

  const name = String(prop);
  if (FORBIDDEN_PROPS.has(name)) {
    throw new Error(`Access to "${name}" is not allowed`);
  }

  return name;
};

const memberTarget = (
  ctx: Ctx,
  node: AstNode
): { object: unknown; prop: string | number; optional: boolean } => {
  const object = evalNode(ctx, node.object as AstNode);
  const prop = node.computed
    ? guardProp(evalNode(ctx, node.property as AstNode))
    : guardProp((node.property as AstNode).name);

  return { object, prop, optional: node.optional === true };
};

const readMember = (ctx: Ctx, node: AstNode): unknown => {
  const { object, prop, optional } = memberTarget(ctx, node);

  if (object === null || object === undefined) {
    if (optional) return undefined;
    throw new Error(`Cannot read "${String(prop)}" of ${String(object)}`);
  }

  return (object as Record<string | number, unknown>)[prop];
};

const evalNode = (ctx: Ctx, node: AstNode): unknown => {
  if (++ctx.steps > MAX_STEPS) {
    throw new Error("Sandbox execution budget exceeded");
  }

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
      return node.value;
    case "TemplateLiteral": {
      const quasis = node.quasis as AstNode[];
      const expressions = node.expressions as AstNode[];
      let text = "";
      quasis.forEach((quasi, index) => {
        text += (quasi.value as { cooked?: string }).cooked ?? "";
        if (index < expressions.length) {
          text += String(evalNode(ctx, expressions[index]));
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
      const args: unknown[] = [];
      for (const argument of node.arguments as AstNode[]) {
        if (argument.type === "SpreadElement") {
          const spread = evalNode(ctx, argument.argument as AstNode);
          if (Array.isArray(spread)) args.push(...spread);
        } else {
          args.push(evalNode(ctx, argument));
        }
      }

      if (callee.type === "MemberExpression") {
        const { object, prop, optional } = memberTarget(ctx, callee);
        if (object === null || object === undefined) {
          if (optional || node.optional === true) return undefined;
          throw new Error(`Cannot call "${String(prop)}" of ${String(object)}`);
        }

        const fn = (object as Record<string | number, unknown>)[prop];
        if (typeof fn !== "function") {
          if (node.optional === true && fn == null) return undefined;
          throw new Error(`"${String(prop)}" is not a function`);
        }
        if (fn === Function || fn === eval) {
          throw new Error("This function is not allowed");
        }

        return (fn as (...values: unknown[]) => unknown).apply(object, args);
      }

      const fn = evalNode(ctx, callee);
      if (typeof fn !== "function") {
        if (node.optional === true && fn == null) return undefined;
        throw new Error("Value is not a function");
      }
      if (fn === Function || fn === eval) {
        throw new Error("This function is not allowed");
      }

      return (fn as (...values: unknown[]) => unknown)(...args);
    }
    case "ArrowFunctionExpression": {
      const params = node.params as AstNode[];
      const body = node.body as AstNode;
      const capturedScopes = [...ctx.scopes];

      return (...args: unknown[]): unknown => {
        const callScope: Scope = new Map();
        params.forEach((param, index) => {
          if (param.type !== "Identifier") {
            throw new Error("Only simple parameters are supported");
          }
          callScope.set(param.name as string, args[index]);
        });

        const callCtx: Ctx = {
          steps: ctx.steps,
          scopes: [...capturedScopes, callScope],
        };
        const result = evalNode(callCtx, body);
        ctx.steps = callCtx.steps;

        if (result instanceof ReturnSignal) return result.value;
        return node.expression === true ? result : undefined;
      };
    }
    case "BinaryExpression": {
      const left = evalNode(ctx, node.left as AstNode) as never;
      const right = evalNode(ctx, node.right as AstNode) as never;
      switch (node.operator) {
        case "===": return left === right;
        case "!==": return left !== right;
        case "==": return left == right;
        case "!=": return left != right;
        case "<": return left < right;
        case "<=": return left <= right;
        case ">": return left > right;
        case ">=": return left >= right;
        case "+": return (left as number) + (right as number);
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
        case "-": return -(argument as number);
        case "+": return +(argument as number);
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
          if (Array.isArray(spread)) values.push(...spread);
        } else {
          values.push(evalNode(ctx, element));
        }
      }
      return values;
    }
    case "ObjectExpression": {
      const result: Record<string, unknown> = {};
      for (const property of node.properties as AstNode[]) {
        if (property.type === "SpreadElement") {
          const spread = evalNode(ctx, property.argument as AstNode);
          if (spread && typeof spread === "object") {
            for (const [key, value] of Object.entries(spread)) {
              result[String(guardProp(key))] = value;
            }
          }
          continue;
        }

        const keyNode = property.key as AstNode;
        const key = property.computed
          ? guardProp(evalNode(ctx, keyNode))
          : guardProp(
              keyNode.type === "Identifier" ? keyNode.name : keyNode.value
            );
        result[String(key)] = evalNode(ctx, property.value as AstNode);
      }
      return result;
    }
    default:
      throw new Error(`Unsupported syntax: ${node.type}`);
  }
};

const SAFE_BUILTINS: Record<string, unknown> = {
  undefined,
  NaN,
  Infinity,
  Math,
  JSON,
  Number,
  String,
  Boolean,
  Array,
  Object,
  Date,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
};

export function runSandboxed(
  code: string,
  globals: Record<string, unknown> = {}
): unknown {
  const ast = parse(code, {
    ecmaVersion: "latest",
    allowReturnOutsideFunction: true,
  }) as unknown as AstNode;

  const ctx: Ctx = {
    steps: 0,
    scopes: [
      new Map(Object.entries({ ...SAFE_BUILTINS, ...globals })),
      new Map(),
    ],
  };

  const result = evalNode(ctx, ast);
  return result instanceof ReturnSignal ? result.value : undefined;
}
