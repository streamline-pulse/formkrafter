/**
 * Parity fixtures for the Python port (python/): the core compiles every case of
 * python/tests/parity/cases.json and records the schema, the lint issues and the
 * verdict on each data sample; it also evaluates jsonlogic.json (rules) and
 * utils.json (identifiers, plates, registries, MRZ). pytest replays them against the Python package, so
 * a change in the core that the port does not follow fails the Python tests.
 *
 *   bun scripts/python-parity.ts          # rewrite expected.json
 *   bun scripts/python-parity.ts --check  # fail when expected.json is stale (CI)
 */
import { readFileSync, writeFileSync } from "node:fs";
// Modules, not the index: the index re-exports types as values, which bun cannot load from source.
import { buildValidationSchema, type BrickSpec } from "../packages/core/lib/utils/brick-spec.ts";
import { lintSpec } from "../packages/core/lib/utils/lint-spec.ts";
import { validateFormData } from "../packages/core/lib/validators/validator.ts";
import { checkIdentity, formatIban } from "../packages/core/lib/utils/identity.ts";
import { checkCompanyRegistry, checkPlate, formatCompanyRegistry, formatPlate } from "../packages/core/lib/utils/registries.ts";
import { parseMrz } from "../packages/core/lib/utils/mrz.ts";
// the core's own copy: workspaces install dependencies per package
import jsonLogic from "../packages/core/node_modules/json-logic-js/logic.js";

type Case = { name: string; spec: BrickSpec; locales: (string | null)[]; data: unknown[] };

const root = new URL("../python/tests/parity/", import.meta.url);
const cases = JSON.parse(readFileSync(new URL("cases.json", root), "utf8")) as Case[];
const read = (name: string) => JSON.parse(readFileSync(new URL(name, root), "utf8"));
const logicCases = read("jsonlogic.json") as { logic: unknown; data: unknown }[];
const utils = read("utils.json") as Record<string, unknown[]>;

// JSON keeps no undefined: mark it, so the port can tell it from null
const marked = (value: unknown): unknown => (value === undefined ? { $undefined: true } : value);
const evaluate = (logic: unknown, data: unknown) => {
  try {
    return { result: marked(jsonLogic.apply(logic as never, data)) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
};
const pairs = (name: string) => utils[name] as [string, string][];

const core = JSON.parse(readFileSync(new URL("../packages/core/package.json", import.meta.url), "utf8")) as { version: string };

const expected = {
  core: core.version,
  cases: cases.map(({ name, spec, locales, data }) => ({
    name,
    lint: lintSpec(spec),
    locales: locales.map((locale) => ({
      locale,
      schema: buildValidationSchema(spec, locale ?? undefined),
      results: data.map((sample) => {
        try {
          return validateFormData(spec, sample, locale ?? undefined);
        } catch (error) {
          return { error: error instanceof Error ? error.message : String(error) };
        }
      }),
    })),
  })),
  jsonlogic: logicCases.map(({ logic, data }) => evaluate(logic, data)),
  utils: {
    identity: pairs("identity").map(([format, value]) => checkIdentity(format, value)),
    formatIban: (utils.formatIban as string[]).map((value) => formatIban(value)),
    plates: pairs("plates").map(([format, value]) => [checkPlate(format, value), formatPlate(format, value)]),
    registries: pairs("registries").map(([format, value]) => [
      checkCompanyRegistry(format, value),
      formatCompanyRegistry(format, value),
    ]),
    mrz: (utils.mrz as string[]).map((text) => parseMrz(text)),
  },
};

const output = `${JSON.stringify(expected, null, 2)}\n`;
const target = new URL("expected.json", root);

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(target, "utf8");
  } catch {
    // missing file: stale by definition
  }
  if (current !== output) {
    console.error("python/tests/parity/expected.json is stale: run `bun scripts/python-parity.ts`.");
    process.exit(1);
  }
} else {
  writeFileSync(target, output);
  console.log(`wrote ${expected.cases.length} cases (core ${core.version})`);
}
