/**
 * National identifier checks. Each format is a published rule, not a guess:
 * - `fr-nir`: French social security number, 13 digits + 2-digit key
 *   (97 - number mod 97), Corsica departments 2A / 2B handled.
 * - `bj-npi`: Benin personal identification number, 10 digits.
 * - `digits-<n>`: exactly n digits, for registries without a public key.
 * Spaces and dots are ignored on input; the stored value keeps what was typed.
 */

export type IdentityFormat = "fr-nir" | "bj-npi" | `digits-${number}`;

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

/** True when `value` satisfies `format`; unknown formats accept any non-empty value. */
export function checkIdentity(format: string, value: string): boolean {
  if (format === "fr-nir") return checkFrNir(value);
  if (format === "bj-npi") return checkBjNpi(value);
  const digits = /^digits-([0-9]{1,3})$/.exec(format);
  if (digits) return checkDigits(value, Number(digits[1]));
  return value.trim().length > 0;
}

export const IDENTITY_FORMATS: { id: string; label: string }[] = [
  { id: "fr-nir", label: "France · NIR (sécurité sociale)" },
  { id: "bj-npi", label: "Bénin · NPI" },
  { id: "digits-10", label: "10 chiffres" },
  { id: "digits-13", label: "13 chiffres" },
];
