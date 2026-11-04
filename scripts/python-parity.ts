/**
 * Parity fixtures for the Python port (python/): the core compiles every case of
 * python/tests/parity/cases.json and records the schema, the lint issues and the
 * verdict on each data sample. pytest replays them against the Python package, so
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

type Case = { name: string; spec: BrickSpec; locales: (string | null)[]; data: unknown[] };

const root = new URL("../python/tests/parity/", import.meta.url);
const cases = JSON.parse(readFileSync(new URL("cases.json", root), "utf8")) as Case[];
const core = JSON.parse(readFileSync(new URL("../packages/core/package.json", import.meta.url), "utf8")) as { version: string };

const expected = {
  core: core.version,
  cases: cases.map(({ name, spec, locales, data }) => ({
    name,
    lint: lintSpec(spec),
    locales: locales.map((locale) => ({
      locale,
      schema: buildValidationSchema(spec, locale ?? undefined),
      results: data.map((sample) => validateFormData(spec, sample, locale ?? undefined)),
    })),
  })),
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
