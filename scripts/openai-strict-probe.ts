/**
 * Sends packages/core/schema/form-spec.strict.schema.json to OpenAI's strict
 * structured output and checks what the model writes: the schema must be
 * accepted, and the « Vos canaux » form must come back usable through
 * fromStrictSpec. Calls the paid API: run by hand, or from the "AI profile"
 * workflow, never on every pull request.
 *
 *   OPENAI_API_KEY=… bun scripts/openai-strict-probe.ts [model …] [--save out.json]
 *   bun scripts/openai-strict-probe.ts --file out.json   # check a saved output, no API call
 */
import { readFileSync, writeFileSync } from "node:fs";
// Modules, not the index: the index re-exports types as values, which bun cannot load from source.
import { fromStrictSpec } from "../packages/core/lib/ai/from-strict-spec.ts";
import { lintSpec } from "../packages/core/lib/utils/lint-spec.ts";
import { validateFormData } from "../packages/core/lib/validators/validator.ts";
import type { BrickSpec } from "../packages/core/lib/utils/brick-spec.ts";

const PROMPT =
  "Écris un formulaire « Vos canaux ». Pour chaque canal (LinkedIn, Facebook, Instagram, Blog / site, YouTube, TikTok, X, Newsletter), " +
  "une case « je publie ici ». Pour LinkedIn et Facebook seulement, un choix Page entreprise ou Profil personnel, et l'adresse de la page : " +
  "ces deux questions ne s'affichent que quand la case du canal est cochée. Libellés en français.";

const args = process.argv.slice(2);
const option = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const saveAt = option("--save");
const savedOutput = option("--file");
const models = args.filter((arg, index) => !arg.startsWith("--") && !["--save", "--file"].includes(args[index - 1]));
if (!models.length) models.push("gpt-6.1-sol", "gpt-6-luna");

const schema = JSON.parse(readFileSync(new URL("../packages/core/schema/form-spec.strict.schema.json", import.meta.url), "utf8"));

const bricks = (spec: BrickSpec): BrickSpec[] => [spec, ...(spec.children ?? []).flatMap(bricks)];
const readsVar = (logic: unknown, name: string): boolean => JSON.stringify(logic ?? null).includes(`{"var":${JSON.stringify(name)}}`);

/** What the review asks of the form, as failures; empty when it passes. */
function acceptance(spec: BrickSpec): string[] {
  const failures: string[] = [];
  const all = bricks(spec);
  const boxes = all.filter((brick) => brick.id === "checkbox").map((brick) => String(brick.configs?.key));
  const hiddenByABox = (brick: BrickSpec) =>
    (brick.rules ?? []).some((rule) => rule.effects?.some((effect) => effect.property?.target === "hidden") && boxes.some((box) => readsVar(rule.logic, box)));
  const choices = all.filter((brick) => brick.id === "select" || brick.id === "radio");
  const addresses = all.filter((brick) => brick.id === "url" || brick.id === "text");

  if (boxes.length !== 8) failures.push(`${boxes.length} checkboxes, 8 expected`);
  if (choices.length < 2) failures.push(`${choices.length} account type questions, 2 expected`);
  for (const choice of choices) {
    const options = Array.isArray(choice.configs?.options) ? choice.configs.options.length : 0;
    if (options < 2) failures.push(`${choice.configs?.key}: ${options} options`);
    if (!hiddenByABox(choice)) failures.push(`${choice.configs?.key}: not hidden until its box is ticked`);
  }
  if (addresses.length < 2) failures.push(`${addresses.length} address inputs, 2 expected`);
  for (const address of addresses) if (!hiddenByABox(address)) failures.push(`${address.configs?.key}: not hidden until its box is ticked`);
  const lint = lintSpec(spec);
  if (lint.length) failures.push(...lint.map((issue) => `lint: ${issue.message}`));
  if (!validateFormData(spec, {}, "fr").valid && choices.every(hiddenByABox) && addresses.every(hiddenByABox))
    failures.push("an empty form is refused although every question it would require is hidden");
  return failures;
}

if (savedOutput) {
  const failures = acceptance(fromStrictSpec(JSON.parse(readFileSync(savedOutput, "utf8"))));
  console.log(failures.length ? `✗ ${savedOutput}:\n  ${failures.join("\n  ")}` : `✓ ${savedOutput}: form complete`);
  process.exit(failures.length ? 1 : 0);
}

const key = process.env.OPENAI_API_KEY;
if (!key) {
  console.error("OPENAI_API_KEY is not set.");
  process.exit(1);
}

let failed = false;
for (const model of models) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      input: PROMPT,
      max_output_tokens: 16000,
      text: { format: { type: "json_schema", name: "form_spec", schema, strict: true } },
    }),
  });
  const body = (await response.json()) as {
    status?: string;
    error?: { message?: string };
    output?: { type: string; content?: { type: string; text?: string }[] }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  if (!response.ok) {
    // 400 is OpenAI judging the schema; anything else (key, quota, model) says nothing about it.
    const verdict = response.status === 400 ? "schema refused" : "request failed";
    console.log(`✗ ${model}: ${verdict} (${response.status}): ${body.error?.message}`);
    failed = true;
    continue;
  }
  const text = body.output?.find((item) => item.type === "message")?.content?.find((part) => part.type === "output_text")?.text ?? "";
  let spec: BrickSpec;
  try {
    const output = JSON.parse(text);
    spec = fromStrictSpec(output);
    if (saveAt) writeFileSync(saveAt.replace(/(\.json)?$/, `.${model}.json`), `${JSON.stringify(output, null, 2)}\n`);
  } catch (error) {
    console.log(`✗ ${model}: accepted, but the output is not usable (${body.status}): ${(error as Error).message}`);
    failed = true;
    continue;
  }
  const failures = acceptance(spec);
  const usage = `${body.usage?.input_tokens ?? "?"} in, ${body.usage?.output_tokens ?? "?"} out`;
  if (failures.length) {
    console.log(`✗ ${model}: accepted, form incomplete (${usage}):\n  ${failures.join("\n  ")}`);
    failed = true;
  } else {
    console.log(`✓ ${model}: accepted, form complete (${usage})`);
  }
}
process.exit(failed ? 1 : 0);
