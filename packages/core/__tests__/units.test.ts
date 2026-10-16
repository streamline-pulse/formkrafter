import { describe, expect, test } from "bun:test";
import { convertMeasure, formatMeasure, measureUnits, measureValue } from "../lib/utils/units.js";

describe("mesures", () => {
  test("convertit dans une famille et refuse une unite inconnue", () => {
    expect(convertMeasure("area", 2.5, "ha", "m2")).toBe(25_000);
    expect(convertMeasure("length", 1500, "m", "km")).toBe(1.5);
    expect(convertMeasure("mass", 2, "t", "kg")).toBe(2000);
    expect(convertMeasure("duration", 90, "min", "h")).toBe(1.5);
    expect(convertMeasure("area", 1, "ha", "kg")).toBeUndefined();
  });

  test("la valeur stockee porte l'equivalent en unite de base", () => {
    expect(measureValue("area", 3, "ha")).toEqual({ value: 3, unit: "ha", base: 30_000 });
    expect(measureValue("volume", 250, "ml")).toEqual({ value: 250, unit: "ml", base: 0.25 });
    expect(measureValue("area", Number.NaN, "ha")).toBeUndefined();
    expect(measureValue("area", 3, "acre")).toBeUndefined();
  });

  test("les unites proposees se restreignent par configuration", () => {
    expect(measureUnits("area", "ha, m2").map((u) => u.id)).toEqual(["m2", "ha"]);
    expect(measureUnits("area", "acre").map((u) => u.id)).toEqual(["m2", "a", "ha", "km2"]);
    expect(formatMeasure("area", { value: 2.5, unit: "ha", base: 25_000 }, "fr-FR")).toBe("2,5 ha");
  });
});
