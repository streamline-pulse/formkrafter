import type { BrickType } from "../utils/brick-type.js";

/**
 * The bricks a language model may write, with the configs each one reads. The
 * strict schema (schema/form-spec.strict.schema.json) is generated from this
 * list and fromStrictSpec reads it back, so a brick or a config a model can use
 * is declared once, here. The web components test that every registered brick
 * is either listed here or in AI_EXCLUDED_BRICKS, with the configs it reads.
 */
export type CatalogConfig =
  | { kind: "text"; description: string }
  | { kind: "string"; description: string }
  | { kind: "number"; description: string }
  | { kind: "options"; description: string };

export type CatalogDataType = "string" | "number" | "boolean" | "array" | "void";

export interface CatalogBrick {
  id: string;
  type: BrickType;
  dataType: CatalogDataType;
  /** What the brick is for, written for the model. */
  description: string;
  /** Configs besides key, label and description, which every field has. */
  configs: Record<string, CatalogConfig>;
  /** Whether the brick holds a value under configs.key. */
  field: boolean;
  /** "bricks": any brick; "fields": the fields of one row of a collection. */
  children?: "bricks" | "fields";
}

const placeholder: CatalogConfig = { kind: "text", description: "Example shown in the empty control." };
const options: CatalogConfig = { kind: "options", description: "The choices, in display order: label shown, value stored." };

const field = (
  id: string,
  dataType: CatalogDataType,
  description: string,
  configs: Record<string, CatalogConfig> = {},
): CatalogBrick => ({ id, type: "input", dataType, description, configs, field: true });

export const BRICK_CATALOG: readonly CatalogBrick[] = [
  field("text", "string", "One line of free text.", {
    placeholder,
    mask: { kind: "string", description: "Input mask: 9 a digit, a a letter, A a letter in capitals, * either; other characters are inserted as they are." },
  }),
  field("textarea", "string", "Several lines of free text.", { placeholder }),
  field("email", "string", "An email address.", { placeholder }),
  field("url", "string", "A web address (https://…).", { placeholder }),
  field("phone", "string", "A phone number.", {
    placeholder,
    mask: { kind: "string", description: "Input mask: 9 a digit, other characters inserted as they are, for example +228 99 99 99 99." },
  }),
  field("number", "number", "A number.", {
    placeholder,
    prefix: { kind: "text", description: "Shown before the control, for example a currency." },
    suffix: { kind: "text", description: "Shown after the control, for example a unit." },
  }),
  field("date", "string", "A date, stored as YYYY-MM-DD."),
  field("time", "string", "A time of day, stored as HH:MM."),
  field("datetime", "string", "A date and a time."),
  field("checkbox", "boolean", "A yes/no box; the label sits beside it. Use it for each item of a list someone ticks."),
  field("select", "string", "One choice in a drop-down list. Prefer radio for 2 to 4 short choices.", { placeholder, options }),
  field("radio", "string", "One choice among a few options, all visible.", { options }),
  field("multi-select", "array", "Several choices in a drop-down list.", { placeholder, options }),
  field("select-boxes", "array", "Several choices, one box each, all visible.", { options }),
  {
    id: "data-grid",
    type: "collection",
    dataType: "array",
    description: "A table whose rows the person adds; children are the fields of one row.",
    configs: {},
    field: true,
    children: "fields",
  },
  {
    id: "content",
    type: "output",
    dataType: "void",
    description: "Fixed text shown to the person, not a question. Put it above or below a row, not in it.",
    configs: { content: { kind: "text", description: "The text, one paragraph per line." } },
    field: false,
  },
  {
    id: "group",
    type: "panel",
    dataType: "void",
    description: "A titled box around related bricks.",
    configs: { label: { kind: "text", description: "The group's title." } },
    field: false,
    children: "bricks",
  },
  {
    id: "row",
    type: "panel",
    dataType: "void",
    description: "Bricks side by side; they stack on narrow screens. Put in one row only questions shown together.",
    configs: {},
    field: false,
    children: "bricks",
  },
  {
    id: "column",
    type: "panel",
    dataType: "void",
    description: "Bricks one under the other; the usual root of a form.",
    configs: {},
    field: false,
    children: "bricks",
  },
];

/** Registered bricks a model does not write, and why. */
export const AI_EXCLUDED_BRICKS: Readonly<Record<string, string>> = {
  password: "a form written by a model must not ask for a password",
  hidden: "carries a value the host sets, not one a person enters",
  tags: "free list of words; select-boxes or textarea cover what a model needs",
  signature: "legal capture belongs in forms a person designs",
  "geo-point": "needs the host's map tiles",
  "geo-area": "needs the host's map tiles",
  "geo-address": "needs the host's search and map services",
  "geo-layer": "needs the host's layers",
  "national-id": "country identifier formats are a design decision",
  mrz: "identity documents belong in forms a person designs",
  "tax-id": "country identifier formats are a design decision",
  iban: "bank details belong in forms a person designs",
  money: "currency lists are a design decision",
  appointment: "needs the host's slot provider",
  document: "needs the host's document reader",
  measure: "unit families are a design decision",
  "vehicle-plate": "country plate formats are a design decision",
  "company-registry": "country registry formats are a design decision",
  "date-range": "two dates cover it",
  tabs: "navigation belongs in forms a person designs",
  stepper: "navigation belongs in forms a person designs",
  address: "the host's address model is a design decision",
  file: "needs the host's upload service",
  "key-value": "free-form object, not a question",
  recap: "a summary page, not a question",
  code: "a code editor is not a question for a person",
  "nested-form": "references the host's stored forms",
};

const byId = new Map(BRICK_CATALOG.map((brick) => [brick.id, brick]));

export const catalogBrick = (id: string): CatalogBrick | undefined => byId.get(id);
