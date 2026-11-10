/**
 * The AI profile of the form spec: packages/core/schema/form-spec.strict.schema.json,
 * generated from the brick catalog for OpenAI's strict structured output (every
 * object closed, every property required, optional ones nullable, no $ref with
 * siblings, a plain object at the root). fromStrictSpec turns what a model writes
 * against it back into a canonical spec.
 *
 *   bun scripts/strict-schema.ts          # rewrite the schema
 *   bun scripts/strict-schema.ts --check  # fail when it is stale or leaves the strict subset (CI)
 */
import { readFileSync, writeFileSync } from "node:fs";
// Modules, not the index: the index re-exports types as values, which bun cannot load from source.
import { BRICK_CATALOG, type CatalogBrick, type CatalogConfig } from "../packages/core/lib/ai/brick-catalog.ts";

type Schema = Record<string, unknown>;

const TARGET = "packages/core/schema/form-spec.strict.schema.json";

const VALIDATORS = ["required", "minLength", "maxLength", "min", "max", "pattern", "minItems", "maxItems", "email", "url"];

// JsonLogic, the part forms need. Every operator takes an array of arguments.
const OPERATORS: Record<string, string> = {
  "==": "equal",
  "!=": "not equal",
  "!": "not (one argument)",
  ">": "greater than",
  ">=": "greater than or equal",
  "<": "less than",
  "<=": "less than or equal",
  in: "the first argument is in the second, a list or a text",
  and: "all arguments true",
  or: "at least one argument true",
  "+": "sum",
  if: "[condition, then, else]",
};

const nullable = (schema: Schema): Schema =>
  "$ref" in schema || "anyOf" in schema || schema.type === "object" || schema.type === "array"
    ? { anyOf: [schema, { type: "null" }] }
    : { ...schema, type: [schema.type, "null"] };

const object = (properties: Record<string, Schema>, description?: string): Schema => ({
  type: "object",
  ...(description ? { description } : {}),
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

const configSchema = (config: CatalogConfig): Schema => {
  if (config.kind === "options") return { type: "array", description: config.description, items: { $ref: "#/$defs/option" } };
  return { type: config.kind === "number" ? "number" : "string", description: config.description };
};

const VALUE_TYPES = { string: "string", number: "number", boolean: "boolean" } as const;

const defaultValue = (brick: CatalogBrick): Schema | undefined => {
  if (brick.dataType === "array") return nullable({ type: "array", description: "Values ticked or chosen at the start.", items: { type: "string" } });
  if (brick.dataType in VALUE_TYPES) return { type: [VALUE_TYPES[brick.dataType as keyof typeof VALUE_TYPES], "null"], description: "The answer at the start." };
  return undefined;
};

const brickSchema = (brick: CatalogBrick): Schema => {
  const configs: Record<string, Schema> = {};
  if (brick.field) {
    configs.key = { type: "string", description: "The answer's name in the form data: letters, digits and _, unique in the form. Rules read it with var." };
    configs.label = { type: "string", description: "The question, as the person reads it." };
    configs.description = { type: ["string", "null"], description: "Help shown under the question." };
  }
  for (const [name, config] of Object.entries(brick.configs)) {
    const schema = configSchema(config);
    configs[name] = config.kind === "options" || brick.id === "content" ? schema : nullable(schema);
  }
  const start = defaultValue(brick);
  if (start && brick.type === "input") configs.defaultValue = start;

  const properties: Record<string, Schema> = {
    id: { type: "string", enum: [brick.id], description: brick.description },
  };
  if (Object.keys(configs).length) properties.configs = object(configs);
  if (brick.field) properties.validations = nullable({ type: "array", items: { $ref: "#/$defs/validation" } });
  properties.hiddenWhen = nullable({ $ref: "#/$defs/logic" });
  if (brick.field) properties.disabledWhen = nullable({ $ref: "#/$defs/logic" });
  if (brick.id === "row") {
    properties.layout = nullable(
      object({ columns: { type: ["integer", "null"], minimum: 1, maximum: 12, description: "Equal columns, so a field alone keeps its share." } }),
    );
  }
  if (brick.children === "bricks") properties.children = { type: "array", items: { $ref: "#/$defs/brick" } };
  if (brick.children === "fields") properties.children = { type: "array", description: "The fields of one row.", items: { $ref: "#/$defs/field" } };
  return object(properties);
};

const defName = (id: string) => `brick_${id.replace(/-/g, "_")}`;

export function buildStrictSchema(): Schema {
  const defs: Record<string, Schema> = {};
  for (const brick of BRICK_CATALOG) defs[defName(brick.id)] = brickSchema(brick);

  const refs = (bricks: readonly CatalogBrick[]) => bricks.map((brick) => ({ $ref: `#/$defs/${defName(brick.id)}` }));
  defs.brick = { anyOf: refs(BRICK_CATALOG) };
  defs.field = { anyOf: refs(BRICK_CATALOG.filter((brick) => brick.type === "input")) };
  defs.option = object({ label: { type: "string" }, value: { type: "string" } });
  defs.validation = object({
    validator: { type: "string", enum: VALIDATORS },
    value: { type: ["number", "string", "null"], description: "A number for min/max and the lengths, a regular expression for pattern, null otherwise." },
    message: { type: ["string", "null"], description: "Replaces the built-in message." },
  });
  defs.logic = {
    anyOf: [
      object({ var: { type: "string", description: "The key of a field: its answer." } }),
      ...Object.entries(OPERATORS).map(([operator, meaning]) =>
        object({ [operator]: { type: "array", description: meaning, items: { $ref: "#/$defs/logicArgument" } } }),
      ),
    ],
  };
  defs.logicArgument = {
    anyOf: [{ $ref: "#/$defs/logic" }, { type: "string" }, { type: "number" }, { type: "boolean" }, { type: "null" }],
  };

  return {
    type: "object",
    description:
      "A FormKrafter form, written for OpenAI strict structured output. Pass it to fromStrictSpec from @streamline-pulse/formkrafter-core before rendering or validating it.",
    properties: { form: { $ref: "#/$defs/brick" } },
    required: ["form"],
    additionalProperties: false,
    $defs: defs,
  };
}

/** Where a schema leaves the subset OpenAI accepts with strict: true; empty when it stays in. */
export function strictSubsetErrors(schema: Schema): string[] {
  const errors: string[] = [];
  const defs = (schema.$defs ?? {}) as Record<string, Schema>;
  const UNSUPPORTED = ["oneOf", "allOf", "not", "if", "then", "else", "patternProperties", "dependentRequired", "dependentSchemas", "unevaluatedProperties", "propertyNames"];
  let properties = 0;
  let enumValues = 0;

  if (schema.type !== "object" || "anyOf" in schema || "$ref" in schema) errors.push("root: must be a plain object, not anyOf or $ref");

  const walk = (node: unknown, path: string, depth: number): void => {
    if (typeof node !== "object" || node === null || Array.isArray(node)) return void errors.push(`${path}: not a schema`);
    const n = node as Schema;
    for (const keyword of UNSUPPORTED) if (keyword in n) errors.push(`${path}: ${keyword} is not supported`);
    if ("$ref" in n) {
      if (Object.keys(n).length > 1) errors.push(`${path}: $ref has siblings (${Object.keys(n).filter((k) => k !== "$ref").join(", ")})`);
      const target = String(n.$ref).replace("#/$defs/", "");
      if (!(target in defs)) errors.push(`${path}: $ref to missing ${n.$ref}`);
      return;
    }
    if (!("type" in n) && !("anyOf" in n) && !("enum" in n)) errors.push(`${path}: no type`);
    if (Array.isArray(n.enum)) enumValues += n.enum.length;
    if (depth > 10) errors.push(`${path}: nested deeper than 10 levels`);
    const types = ([] as unknown[]).concat(n.type ?? []);
    if (types.includes("object")) {
      if (n.additionalProperties !== false) errors.push(`${path}: additionalProperties must be false`);
      const keys = Object.keys((n.properties ?? {}) as object);
      const required = (n.required ?? []) as string[];
      if (keys.length !== required.length || keys.some((key) => !required.includes(key)))
        errors.push(`${path}: required must list every property`);
      properties += keys.length;
      for (const key of keys) walk((n.properties as Schema)[key], `${path}.${key}`, depth + 1);
    }
    if (types.includes("array")) walk(n.items, `${path}[]`, depth + 1);
    if (Array.isArray(n.anyOf)) n.anyOf.forEach((option, index) => walk(option, `${path}|${index}`, depth));
  };

  walk(schema, "root", 0);
  for (const [name, def] of Object.entries(defs)) walk(def, `$defs.${name}`, 0);
  if (properties > 5000) errors.push(`${properties} properties, more than 5000`);
  if (enumValues > 1000) errors.push(`${enumValues} enum values, more than 1000`);
  return errors;
}

if (import.meta.main) {
  const schema = buildStrictSchema();
  const errors = strictSubsetErrors(schema);
  if (errors.length) {
    console.error(`The strict schema leaves OpenAI's strict subset:\n  ${errors.join("\n  ")}`);
    process.exit(1);
  }
  const output = `${JSON.stringify(schema, null, 2)}\n`;
  if (process.argv.includes("--check")) {
    let current = "";
    try {
      current = readFileSync(TARGET, "utf8");
    } catch {
      // missing file: stale by definition
    }
    if (current !== output) {
      console.error(`${TARGET} is stale: run \`bun scripts/strict-schema.ts\`.`);
      process.exit(1);
    }
    console.log(`${TARGET} is up to date`);
  } else {
    writeFileSync(TARGET, output);
    console.log(`wrote ${TARGET} (${BRICK_CATALOG.length} bricks)`);
  }
}
