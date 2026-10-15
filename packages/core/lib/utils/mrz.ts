/**
 * Machine-readable zone of travel documents (ICAO 9303): TD3 passports
 * (2 lines of 44) and TD1 identity cards (3 lines of 30). The parser reads the
 * fields, verifies every check digit and reports what failed, so a form can
 * refuse a misread zone instead of storing wrong data.
 */

export interface MrzResult {
  raw: string;
  format: "TD1" | "TD3";
  documentType: string;
  issuingCountry: string;
  documentNumber: string;
  nationality: string;
  surname: string;
  givenNames: string;
  /** ISO date, century guessed from the field: birth in the past, expiry in the future. */
  birthDate: string | null;
  sex: "M" | "F" | "X";
  expiryDate: string | null;
  optional: string;
  valid: boolean;
  /** Names of the fields whose check digit does not match. */
  errors: string[];
}

const WEIGHTS = [7, 3, 1];

const charValue = (char: string): number => {
  if (char === "<") return 0;
  if (/[0-9]/.test(char)) return Number(char);
  if (/[A-Z]/.test(char)) return char.charCodeAt(0) - 55;
  return 0;
};

/** ICAO 9303 check digit: weights 7-3-1, modulo 10. */
export function mrzCheckDigit(field: string): number {
  let sum = 0;
  for (let i = 0; i < field.length; i++) sum += charValue(field[i]) * WEIGHTS[i % 3];
  return sum % 10;
}

const checks = (field: string, digit: string): boolean =>
  /[0-9]/.test(digit) && mrzCheckDigit(field) === Number(digit);

const clean = (field: string) => field.replace(/</g, " ").trim().replace(/\s+/g, " ");

const names = (field: string): { surname: string; givenNames: string } => {
  const [surname = "", given = ""] = field.split("<<");
  return { surname: clean(surname), givenNames: clean(given) };
};

const date = (field: string, kind: "birth" | "expiry"): string | null => {
  if (!/^[0-9]{6}$/.test(field)) return null;
  const yy = Number(field.slice(0, 2));
  const month = field.slice(2, 4);
  const day = field.slice(4, 6);
  const now = new Date().getFullYear();
  const century = Math.floor(now / 100) * 100;
  let year = century + yy;
  if (kind === "birth" && year > now) year -= 100;
  if (kind === "expiry" && year < now - 20) year += 100;
  return `${year}-${month}-${day}`;
};

const sex = (char: string): MrzResult["sex"] => (char === "M" ? "M" : char === "F" ? "F" : "X");

/** Splits pasted text into MRZ lines: uppercase, `<` filler, no spaces. */
export function mrzLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, "").toUpperCase())
    .filter((line) => line.length > 0);
}

export function parseMrz(text: string): MrzResult | null {
  const lines = mrzLines(text);
  if (lines.length === 2 && lines.every((line) => line.length === 44)) return parseTd3(lines[0], lines[1], text);
  if (lines.length === 3 && lines.every((line) => line.length === 30)) return parseTd1(lines[0], lines[1], lines[2], text);
  return null;
}

function parseTd3(l1: string, l2: string, raw: string): MrzResult {
  const errors: string[] = [];
  const documentNumber = l2.slice(0, 9);
  if (!checks(documentNumber, l2[9])) errors.push("documentNumber");
  const birth = l2.slice(13, 19);
  if (!checks(birth, l2[19])) errors.push("birthDate");
  const expiry = l2.slice(21, 27);
  if (!checks(expiry, l2[27])) errors.push("expiryDate");
  const optional = l2.slice(28, 42);
  if (optional.replace(/</g, "") && !checks(optional, l2[42])) errors.push("optional");
  const composite = l2.slice(0, 10) + l2.slice(13, 20) + l2.slice(21, 43);
  if (!checks(composite, l2[43])) errors.push("composite");
  return {
    raw,
    format: "TD3",
    documentType: clean(l1.slice(0, 2)),
    issuingCountry: clean(l1.slice(2, 5)),
    documentNumber: clean(documentNumber),
    nationality: clean(l2.slice(10, 13)),
    ...names(l1.slice(5)),
    birthDate: date(birth, "birth"),
    sex: sex(l2[20]),
    expiryDate: date(expiry, "expiry"),
    optional: clean(optional),
    valid: errors.length === 0,
    errors,
  };
}

function parseTd1(l1: string, l2: string, l3: string, raw: string): MrzResult {
  const errors: string[] = [];
  const documentNumber = l1.slice(5, 14);
  if (!checks(documentNumber, l1[14])) errors.push("documentNumber");
  const birth = l2.slice(0, 6);
  if (!checks(birth, l2[6])) errors.push("birthDate");
  const expiry = l2.slice(8, 14);
  if (!checks(expiry, l2[14])) errors.push("expiryDate");
  const composite = l1.slice(5, 30) + l2.slice(0, 7) + l2.slice(8, 15) + l2.slice(18, 29);
  if (!checks(composite, l2[29])) errors.push("composite");
  return {
    raw,
    format: "TD1",
    documentType: clean(l1.slice(0, 2)),
    issuingCountry: clean(l1.slice(2, 5)),
    documentNumber: clean(documentNumber),
    nationality: clean(l2.slice(15, 18)),
    ...names(l3),
    birthDate: date(birth, "birth"),
    sex: sex(l2[7]),
    expiryDate: date(expiry, "expiry"),
    optional: clean(l1.slice(15, 30) + l2.slice(18, 29)),
    valid: errors.length === 0,
    errors,
  };
}
