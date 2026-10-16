/**
 * Measures: a number with a unit, kept with its value in the family's base
 * unit so sums and averages stay meaningful whatever unit each answer used.
 */

export type MeasureFamily = "length" | "area" | "mass" | "volume" | "duration";

export interface MeasureUnit {
  id: string;
  /** Symbol shown to the user. */
  symbol: string;
  /** Multiply a value in this unit by `factor` to get the family's base unit. */
  factor: number;
}

export interface MeasureValue {
  value: number;
  unit: string;
  /** `value` converted to the family's base unit. */
  base: number;
}

export const MEASURE_FAMILIES: Record<MeasureFamily, { base: string; units: MeasureUnit[] }> = {
  length: {
    base: "m",
    units: [
      { id: "mm", symbol: "mm", factor: 0.001 },
      { id: "cm", symbol: "cm", factor: 0.01 },
      { id: "m", symbol: "m", factor: 1 },
      { id: "km", symbol: "km", factor: 1000 },
    ],
  },
  area: {
    base: "m2",
    units: [
      { id: "m2", symbol: "m²", factor: 1 },
      { id: "a", symbol: "a", factor: 100 },
      { id: "ha", symbol: "ha", factor: 10_000 },
      { id: "km2", symbol: "km²", factor: 1_000_000 },
    ],
  },
  mass: {
    base: "kg",
    units: [
      { id: "g", symbol: "g", factor: 0.001 },
      { id: "kg", symbol: "kg", factor: 1 },
      { id: "t", symbol: "t", factor: 1000 },
    ],
  },
  volume: {
    base: "l",
    units: [
      { id: "ml", symbol: "ml", factor: 0.001 },
      { id: "l", symbol: "l", factor: 1 },
      { id: "m3", symbol: "m³", factor: 1000 },
    ],
  },
  duration: {
    base: "h",
    units: [
      { id: "min", symbol: "min", factor: 1 / 60 },
      { id: "h", symbol: "h", factor: 1 },
      { id: "d", symbol: "j", factor: 24 },
    ],
  },
};

export const measureFamilyOf = (value: unknown): MeasureFamily =>
  typeof value === "string" && value in MEASURE_FAMILIES ? (value as MeasureFamily) : "length";

/** The units of a family, restricted to `allowed` (comma-separated ids) when given. */
export function measureUnits(family: MeasureFamily, allowed?: unknown): MeasureUnit[] {
  const all = MEASURE_FAMILIES[family].units;
  if (typeof allowed !== "string" || !allowed.trim()) return all;
  const wanted = allowed.split(",").map((id) => id.trim().toLowerCase()).filter(Boolean);
  const picked = all.filter((unit) => wanted.includes(unit.id));
  return picked.length ? picked : all;
}

export function unitOf(family: MeasureFamily, id: string): MeasureUnit | undefined {
  return MEASURE_FAMILIES[family].units.find((unit) => unit.id === id);
}

const round = (n: number) => Math.round(n * 1e9) / 1e9;

/** Converts between two units of the same family; `undefined` when a unit is unknown. */
export function convertMeasure(family: MeasureFamily, value: number, from: string, to: string): number | undefined {
  const source = unitOf(family, from);
  const target = unitOf(family, to);
  if (!source || !target) return undefined;
  return round((value * source.factor) / target.factor);
}

/** Builds the stored value: the number, its unit and the base-unit equivalent. */
export function measureValue(family: MeasureFamily, value: number, unit: string): MeasureValue | undefined {
  const source = unitOf(family, unit);
  if (!source || !Number.isFinite(value)) return undefined;
  return { value, unit, base: round(value * source.factor) };
}

/** Human form, e.g. `2,5 ha`. */
export function formatMeasure(family: MeasureFamily, value: MeasureValue | undefined, locale?: string): string {
  if (!value) return "";
  const unit = unitOf(family, value.unit);
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(value.value);
  return `${number} ${unit?.symbol ?? value.unit}`;
}
