/**
 * National identifier checks. Each format is a published rule, not a guess:
 * - `fr-nir`: French social security number, 13 digits + 2-digit key
 *   (97 - number mod 97), Corsica departments 2A / 2B handled.
 * - `bj-npi`: Benin personal identification number, 10 digits.
 * - `digits-<n>`: exactly n digits, for registries without a public key.
 * Spaces and dots are ignored on input; the stored value keeps what was typed.
 */

export type IdentityFormat =
  | "fr-nir"
  | "bj-npi"
  | "fr-siren"
  | "fr-siret"
  | "bj-ifu"
  | "iban"
  | `digits-${number}`;

const compact = (value: string) => value.replace(/[\s.-]/g, "").toUpperCase();

export function checkFrNir(value: string): boolean {
  const raw = compact(value);
  if (!/^[12][0-9]{2}(0[1-9]|1[0-2]|[2-9][0-9])(2A|2B|[0-9]{2})[0-9]{6}[0-9]{2}$/.test(raw)) return false;
  // Corsica: 2A counts as 19, 2B as 18 for the key.
  const number = raw.slice(0, 13).replace("2A", "19").replace("2B", "18");
  const key = Number(raw.slice(13));
  return key === 97 - (Number(BigInt(number) % 97n));
}

export function checkBjNpi(value: string): boolean {
  return /^[0-9]{10}$/.test(compact(value));
}

export function checkDigits(value: string, length: number): boolean {
  return new RegExp(`^[0-9]{${length}}$`).test(compact(value));
}

/** Luhn checksum over a string of digits (SIREN, SIRET, card numbers). */
export function checkLuhn(digits: string): boolean {
  if (!/^[0-9]+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let n = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

/** French company number: 9 digits with a Luhn key. */
export function checkFrSiren(value: string): boolean {
  const raw = compact(value);
  return /^[0-9]{9}$/.test(raw) && checkLuhn(raw);
}

/** French establishment number: 14 digits with a Luhn key. */
export function checkFrSiret(value: string): boolean {
  const raw = compact(value);
  return /^[0-9]{14}$/.test(raw) && checkLuhn(raw);
}

/** Benin tax identifier (IFU): 13 digits. */
export function checkBjIfu(value: string): boolean {
  return /^[0-9]{13}$/.test(compact(value));
}

/** IBAN: country code, two check digits, 11 to 30 alphanumerics, ISO 7064 mod 97-10. */
export function checkIban(value: string): boolean {
  const raw = compact(value);
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(raw)) return false;
  const rearranged = raw.slice(4) + raw.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (char) => String(char.charCodeAt(0) - 55));
  return Number(BigInt(numeric) % 97n) === 1;
}

/** True when `value` satisfies `format`; unknown formats accept any non-empty value. */
export function checkIdentity(format: string, value: string): boolean {
  if (format === "fr-nir") return checkFrNir(value);
  if (format === "bj-npi") return checkBjNpi(value);
  if (format === "fr-siren") return checkFrSiren(value);
  if (format === "fr-siret") return checkFrSiret(value);
  if (format === "bj-ifu") return checkBjIfu(value);
  if (format === "iban") return checkIban(value);
  const digits = /^digits-([0-9]{1,3})$/.exec(format);
  if (digits) return checkDigits(value, Number(digits[1]));
  return value.trim().length > 0;
}

export const IDENTITY_FORMATS: { id: string; label: string }[] = [
  { id: "fr-nir", label: "France · NIR (sécurité sociale)" },
  { id: "bj-npi", label: "Bénin · NPI" },
  { id: "fr-siren", label: "France · SIREN" },
  { id: "fr-siret", label: "France · SIRET" },
  { id: "bj-ifu", label: "Bénin · IFU" },
  { id: "iban", label: "IBAN" },
  { id: "digits-10", label: "10 chiffres" },
  { id: "digits-13", label: "13 chiffres" },
];

/** Groups an IBAN by four characters for display. */
export const formatIban = (value: string): string => compact(value).replace(/(.{4})(?=.)/g, "$1 ");
