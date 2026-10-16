/**
 * Public registries: vehicle plates and company registration numbers, each
 * checked against a named format (per country, or a generic one).
 */

const compact = (value: string) => value.replace(/[\s.-]/g, "").toUpperCase();

interface Format {
  id: string;
  label: string;
  /** Tested against the compacted, upper-cased value. */
  test: (value: string) => boolean;
  /** Display form of a valid value (compacted input). */
  format?: (value: string) => string;
}

const group = (value: string, pattern: RegExp, template: string) => value.replace(pattern, template);

export const PLATE_FORMATS: Format[] = [
  {
    id: "fr",
    label: "France · AA-123-AA",
    test: (v) => /^[A-HJ-NP-Z]{2}\d{3}[A-HJ-NP-Z]{2}$/.test(v),
    format: (v) => group(v, /^([A-Z]{2})(\d{3})([A-Z]{2})$/, "$1-$2-$3"),
  },
  {
    id: "bj",
    label: "Bénin · AB 1234 RB",
    test: (v) => /^[A-Z]{1,2}\d{4}[A-Z]{2}$/.test(v),
    format: (v) => group(v, /^([A-Z]{1,2})(\d{4})([A-Z]{2})$/, "$1 $2 $3"),
  },
  {
    id: "ci",
    label: "Côte d’Ivoire · 1234 AB 01",
    test: (v) => /^\d{4}[A-Z]{2}\d{2}$/.test(v),
    format: (v) => group(v, /^(\d{4})([A-Z]{2})(\d{2})$/, "$1 $2 $3"),
  },
  {
    id: "sn",
    label: "Sénégal · AA 123 AA",
    test: (v) => /^[A-Z]{2}\d{3,4}[A-Z]{1,2}$/.test(v),
    format: (v) => group(v, /^([A-Z]{2})(\d{3,4})([A-Z]{1,2})$/, "$1 $2 $3"),
  },
  { id: "generic", label: "Libre (4 à 10 lettres ou chiffres)", test: (v) => /^[A-Z0-9]{4,10}$/.test(v) },
];

export const REGISTRY_FORMATS: Format[] = [
  {
    // RCCM OHADA : RB/COT/01 B 1234 (pays/ville/annee, lettre de categorie, numero).
    id: "ohada-rccm",
    label: "OHADA · RCCM (RB/COT/01 B 1234)",
    test: (v) => /^[A-Z]{2}\/[A-Z]{2,4}\/\d{2,4}[A-Z]\d{3,7}$/.test(v.replace(/[\s]/g, "")),
    format: (v) => v.replace(/^([A-Z]{2}\/[A-Z]{2,4}\/\d{2,4})([A-Z])(\d{3,7})$/, "$1 $2 $3"),
  },
  {
    id: "fr-rcs",
    label: "France · RCS (SIREN + ville)",
    test: (v) => /^\d{9}RCS[A-Z]{2,}$/.test(v.replace(/[\s]/g, "")),
    format: (v) => v.replace(/^(\d{3})(\d{3})(\d{3})RCS(.+)$/, "$1 $2 $3 RCS $4"),
  },
  { id: "generic", label: "Libre (4 à 20 caractères)", test: (v) => /^[A-Z0-9/-]{4,20}$/.test(v) },
];

const find = (list: Format[], id: string) => list.find((format) => format.id === id);

/** Compact form kept in the data for plates (letters and digits only, upper case). */
export const compactPlate = (value: string): string => compact(value);

export function checkPlate(format: string, value: string): boolean {
  const rule = find(PLATE_FORMATS, format) ?? find(PLATE_FORMATS, "generic")!;
  return rule.test(compact(value));
}

export function formatPlate(format: string, value: string): string {
  const rule = find(PLATE_FORMATS, format);
  const compacted = compact(value);
  return rule?.format && rule.test(compacted) ? rule.format(compacted) : value.trim().toUpperCase();
}

/** Registry numbers keep their separators (`/`), only case and spaces are normalised. */
const compactRegistry = (value: string) => value.replace(/\s+/g, "").toUpperCase();

export function checkCompanyRegistry(format: string, value: string): boolean {
  const rule = find(REGISTRY_FORMATS, format) ?? find(REGISTRY_FORMATS, "generic")!;
  return rule.test(compactRegistry(value));
}

export function formatCompanyRegistry(format: string, value: string): string {
  const rule = find(REGISTRY_FORMATS, format);
  const compacted = compactRegistry(value);
  return rule?.format && rule.test(compacted) ? rule.format(compacted) : value.trim().toUpperCase();
}
