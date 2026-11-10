import type { RulesLogic } from "json-logic-js";
import type { BrickSpec } from "../utils/brick-spec.js";
import type { Rule } from "../rules/rule.js";
import type { Validation } from "../validators/validation.js";
import { catalogBrick } from "./brick-catalog.js";

type Node = Record<string, unknown>;

const isNode = (value: unknown): value is Node =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Strict mode makes every property present: an absent one comes as null.
const present = (record: Node): Node =>
  Object.fromEntries(Object.entries(record).filter(([, value]) => value !== null));

// hiddenWhen / disabledWhen: one JsonLogic expression each, written by the model
// instead of a whole rule. The logic itself is kept as is, nulls included.
const RULE_TARGETS = { hiddenWhen: "hidden", disabledWhen: "disabled" } as const;

const rulesOf = (node: Node): Rule[] =>
  (Object.keys(RULE_TARGETS) as (keyof typeof RULE_TARGETS)[])
    .filter((name) => isNode(node[name]))
    .map((name) => ({
      name,
      type: "jsonLogic",
      logic: node[name] as RulesLogic,
      effects: [{ property: { target: RULE_TARGETS[name], type: "boolean" }, boolean: true }],
    }));

const toBrick = (node: unknown, path: string): BrickSpec => {
  if (!isNode(node)) throw new Error(`fromStrictSpec: ${path} is not a brick`);
  const id = String(node.id);
  const entry = catalogBrick(id);
  if (!entry) throw new Error(`fromStrictSpec: ${path} has an unknown brick id "${id}"`);

  const configs = isNode(node.configs) ? present(node.configs) : {};
  if ("options" in configs && (id === "select" || id === "multi-select")) configs.optionsSource = "static";

  const validations = Array.isArray(node.validations)
    ? node.validations.filter(isNode).map((validation) => present(validation) as unknown as Validation)
    : [];
  const rules = rulesOf(node);
  const layout = isNode(node.layout) ? present(node.layout) : {};
  const children = Array.isArray(node.children)
    ? node.children.map((child, index) => toBrick(child, `${path}.${index}`))
    : [];

  return {
    type: entry.type,
    dataType: entry.dataType,
    id,
    name: String(configs.label ?? configs.key ?? id),
    configs,
    ...(validations.length ? { validations } : {}),
    ...(rules.length ? { rules } : {}),
    ...(Object.keys(layout).length ? { layout } : {}),
    ...(children.length ? { children } : {}),
  };
};

/**
 * Turns what a model wrote against schema/form-spec.strict.schema.json into a
 * canonical spec that fk-form-render and validateFormData take unchanged: it
 * unwraps { form }, drops the nulls strict mode fills absent properties with,
 * restores type, dataType and name from the brick id, and expands hiddenWhen /
 * disabledWhen into rules. A form whose root is not a panel gets a column.
 */
export function fromStrictSpec(output: unknown): BrickSpec {
  const root = isNode(output) && "form" in output ? output.form : output;
  const spec = toBrick(root, "form");
  if (spec.type === "panel") return spec;
  return { type: "panel", dataType: "void", id: "column", name: "Form", configs: {}, children: [spec] };
}
