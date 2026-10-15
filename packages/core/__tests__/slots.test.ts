import { describe, expect, test } from "bun:test";
import { generateSlots, groupSlotsByDay, readSlots } from "../lib/utils/slots.js";
import { validateFormData } from "../lib/validators/validator.js";
import type { BrickSpec } from "../lib/utils/brick-spec.js";

// Mardi 20 octobre 2026, 10:00 locale.
const now = new Date(2026, 9, 20, 10, 0);

describe("creneaux de rendez-vous", () => {
  test("genere les creneaux ouverts a partir des regles", () => {
    const slots = generateSlots({ days: [2, 4], from: "09:00", to: "11:00", duration: 30, horizonDays: 7 }, now);
    // Mardi apres 10:00 (2 creneaux), jeudi complet (4), mardi suivant hors horizon de 7 jours.
    expect(slots.map((s) => s.start)).toEqual([
      "2026-10-20T10:00", "2026-10-20T10:30",
      "2026-10-22T09:00", "2026-10-22T09:30", "2026-10-22T10:00", "2026-10-22T10:30",
    ]);
    expect(slots[0]).toEqual({ id: "2026-10-20T10:00", start: "2026-10-20T10:00", end: "2026-10-20T10:30" });
  });

  test("respecte le preavis et les jours fermes", () => {
    const slots = generateSlots({ days: [2, 4], from: "09:00", to: "11:00", duration: 60, horizonDays: 7, noticeHours: 24, exclude: ["2026-10-22"] }, now);
    expect(slots).toEqual([]);
    const later = generateSlots({ days: [2, 4], from: "09:00", to: "11:00", duration: 60, horizonDays: 9, noticeHours: 24 }, now);
    expect(later.map((s) => s.start)).toEqual(["2026-10-22T09:00", "2026-10-22T10:00", "2026-10-27T09:00", "2026-10-27T10:00"]);
  });

  test("lit la reponse d'un fournisseur et regroupe par jour sans les creneaux pleins", () => {
    const slots = readSlots({
      slots: [
        { id: "a", start: "2026-10-21T09:00", end: "2026-10-21T09:30", remaining: 2 },
        { id: "b", start: "2026-10-21T09:30", end: "2026-10-21T10:00", remaining: 0 },
        { start: "2026-10-22T14:00", end: "2026-10-22T14:30" },
        { id: "bad", start: "yesterday" },
      ],
    });
    expect(slots.length).toBe(3);
    const days = groupSlotsByDay(slots);
    expect(days.map((d) => [d.day, d.slots.map((s) => s.id)])).toEqual([
      ["2026-10-21", ["a"]],
      ["2026-10-22", ["2026-10-22T14:00"]],
    ]);
  });

  test("une plage de dates refuse une fin avant le debut", () => {
    const spec = {
      type: "panel", id: "column", name: "F", configs: { uid: "r", key: "form" },
      children: [{ type: "input", dataType: "object", id: "date-range", name: "Range", configs: { uid: "d", key: "periode", label: "Période" } }],
    } as unknown as BrickSpec;
    expect(validateFormData(spec, { periode: { from: "2026-10-01", to: "2026-10-05" } }).valid).toBe(true);
    expect(validateFormData(spec, { periode: { from: "2026-10-01", to: "2026-10-01" } }).valid).toBe(true);
    const bad = validateFormData(spec, { periode: { from: "2026-10-05", to: "2026-10-01" } });
    expect(bad.valid).toBe(false);
    expect(JSON.stringify(bad.errors)).toContain("end before");
  });
});
