import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import Ajv from "ajv";
import { buildStrictSchema, strictSubsetErrors } from "../../../scripts/strict-schema";
import { BRICK_CATALOG } from "../lib/ai/brick-catalog";
import { fromStrictSpec } from "../lib/ai/from-strict-spec";
import { lintSpec } from "../lib/utils/lint-spec";
import { validateFormData } from "../lib/validators/validator";
import type { BrickSpec } from "../lib/utils/brick-spec";

const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));

const strictSchema = read("../schema/form-spec.strict.schema.json");
const canonicalSchema = read("../schema/form-spec.schema.json");
// What a model writes for MarketingFlow's « Vos canaux »: 8 boxes, and for LinkedIn
// and Facebook an account type and an address, hidden until the box is ticked.
const channels = read("./fixtures/strict-channels.json");
// What gpt-6.1-sol and gpt-6-luna wrote for the same request, in strict mode
// (scripts/openai-strict-probe.ts, 10 November 2026). gpt-6.1-sol hides the
// row of a channel's questions; gpt-6-luna hides each question.
const MODEL_OUTPUTS = ["gpt-6.1-sol", "gpt-6-luna"].map((model) => [model, read(`./fixtures/openai-${model}.json`)] as const);

const fields = (spec: BrickSpec): BrickSpec[] =>
  [spec, ...(spec.children ?? []).flatMap(fields)].filter((brick) => brick.configs?.key);

describe("strict schema", () => {
  test("the committed file is the one the catalog generates", () => {
    expect(strictSchema).toEqual(buildStrictSchema());
  });

  test("it stays in OpenAI's strict subset", () => {
    expect(strictSubsetErrors(strictSchema)).toEqual([]);
  });

  test("the subset check finds what OpenAI refused in the canonical schema", () => {
    const errors = strictSubsetErrors(canonicalSchema).join("\n");
    expect(errors).toContain("root: must be a plain object");
    expect(errors).toContain("additionalProperties must be false");
    expect(errors).toContain("required must list every property");
    expect(errors).toContain("$ref has siblings");
    expect(errors).toContain("oneOf is not supported");
    expect(errors).toContain("no type");
  });

  test("every catalog brick can be written, and only those", () => {
    const ids = strictSchema.$defs.brick.anyOf.map((ref: { $ref: string }) => strictSchema.$defs[ref.$ref.replace("#/$defs/", "")].properties.id.enum[0]);
    expect(ids).toEqual(BRICK_CATALOG.map((brick) => brick.id));
  });

  test("a model's output that follows it is valid JSON Schema-wise", () => {
    const validate = new Ajv({ strict: false }).compile(strictSchema);
    expect(validate(channels)).toBe(true);
    expect(validate({ form: { ...channels.form, id: "password" } })).toBe(false);
  });
});

describe("what models wrote", () => {
  for (const [model, output] of MODEL_OUTPUTS) {
    test(`${model}: follows the schema, converts to a sound spec, and an untouched form is valid`, () => {
      expect(new Ajv({ strict: false }).compile(strictSchema)(output)).toBe(true);
      const spec = fromStrictSpec(output);
      expect(lintSpec(spec)).toEqual([]);
      expect(fields(spec).filter((brick) => brick.id === "checkbox")).toHaveLength(8);
      expect(validateFormData(spec, {}, "fr").valid).toBe(true);
    });
  }
});

describe("fromStrictSpec", () => {
  const spec = fromStrictSpec(channels);

  test("unwraps the form, restores type, dataType and name, and drops the nulls", () => {
    expect(spec).toMatchObject({ type: "panel", dataType: "void", id: "group", name: "Vos canaux" });
    const select = fields(spec).find((brick) => brick.configs?.key === "linkedin_account")!;
    expect(select).toMatchObject({ type: "input", dataType: "string", id: "select", name: "Page entreprise ou profil personnel ?" });
    expect(select.configs).toEqual({
      key: "linkedin_account",
      label: "Page entreprise ou profil personnel ?",
      options: [
        { label: "Page entreprise", value: "page" },
        { label: "Profil personnel", value: "profile" },
      ],
      optionsSource: "static",
    });
    expect(JSON.stringify(spec)).not.toContain("null");
    expect(lintSpec(spec)).toEqual([]);
  });

  test("hiddenWhen becomes a rule the renderer and the validator read", () => {
    const url = fields(spec).find((brick) => brick.configs?.key === "facebook_url")!;
    expect(url.rules).toEqual([
      {
        name: "hiddenWhen",
        type: "jsonLogic",
        logic: { "!": [{ var: "facebook" }] },
        effects: [{ property: { target: "hidden", type: "boolean" }, boolean: true }],
      },
    ]);
  });

  test("validates like the renderer: a hidden field is not required", () => {
    expect(validateFormData(spec, { linkedin: false }, "fr").valid).toBe(true);
    const ticked = validateFormData(spec, { linkedin: true }, "fr");
    expect(ticked.valid).toBe(false);
    expect(Object.keys(ticked.errors)).toEqual(["linkedin_account"]);
    expect(validateFormData(spec, { linkedin: true, linkedin_account: "page" }, "fr").valid).toBe(true);
  });

  test("keeps the nulls inside logic, which are values there", () => {
    const out = fromStrictSpec({
      form: {
        id: "text",
        configs: { key: "a", label: "A", description: null, placeholder: null, mask: null, defaultValue: null },
        validations: null,
        hiddenWhen: { "==": [{ var: "b" }, null] },
        disabledWhen: null,
      },
    });
    expect(out.id).toBe("column");
    expect(out.children?.[0].rules?.[0].logic).toEqual({ "==": [{ var: "b" }, null] });
  });

  test("refuses a brick the catalog does not list", () => {
    expect(() => fromStrictSpec({ form: { id: "password", configs: { key: "p", label: "P" } } })).toThrow('unknown brick id "password"');
  });
});
