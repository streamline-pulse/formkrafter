import { describe, expect, test } from "bun:test";
import { checkFrNir, checkIdentity } from "../lib/utils/identity.js";
import { mrzCheckDigit, parseMrz } from "../lib/utils/mrz.js";
import { validateFormData } from "../lib/validators/validator.js";
import type { BrickSpec } from "../lib/utils/brick-spec.js";

// Sample zones published in ICAO Doc 9303 (fictitious "Utopia" documents).
const TD3 = ["P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<", "L898902C36UTO7408122F1204159ZE184226B<<<<<10"].join("\n");
const TD1 = ["I<UTOD231458907".padEnd(30, "<"), "7408122F1204159UTO".padEnd(29, "<") + "6", "ERIKSSON<<ANNA<MARIA".padEnd(30, "<")].join("\n");

describe("identifiants nationaux", () => {
  test("NIR francais : cle modulo 97, Corse comprise", () => {
    expect(checkFrNir("2 69 05 49 588 157 80")).toBe(true);
    expect(checkFrNir("269054958815781")).toBe(false);
    expect(checkFrNir("1 94 02 2A 004 012 09")).toBe(mrzSafe("1940220040120", 9));
    expect(checkFrNir("12345")).toBe(false);
  });

  test("formats simples et inconnus", () => {
    expect(checkIdentity("bj-npi", "1234567890")).toBe(true);
    expect(checkIdentity("bj-npi", "123456789")).toBe(false);
    expect(checkIdentity("digits-13", "1 234 567 890 123")).toBe(true);
    expect(checkIdentity("digits-13", "12345678901234")).toBe(false);
    expect(checkIdentity("whatever", "x")).toBe(true);
    expect(checkIdentity("whatever", " ")).toBe(false);
  });

  test("la brique national-id applique son format dans le schema", () => {
    const spec = {
      type: "panel", id: "column", name: "F", configs: { uid: "r", key: "form" },
      children: [{ type: "input", dataType: "string", id: "national-id", name: "Id", configs: { uid: "n", key: "nir", label: "NIR", idFormat: "fr-nir" } }],
    } as unknown as BrickSpec;
    expect(validateFormData(spec, { nir: "2 69 05 49 588 157 80" }).valid).toBe(true);
    const bad = validateFormData(spec, { nir: "269054958815781" });
    expect(bad.valid).toBe(false);
    expect(JSON.stringify(bad.errors)).toContain("Invalid identifier");
  });
});

// La cle du NIR corse se derive du numero avec 2A -> 19 : on la calcule pour l'exemple.
function mrzSafe(number: string, _: number): boolean {
  const key = 97 - Number(BigInt(number) % 97n);
  return checkFrNir(`1 94 02 2A 004 012 ${String(key).padStart(2, "0")}`);
}

describe("zone de lecture ICAO 9303", () => {
  test("chiffre de controle 7-3-1", () => {
    expect(mrzCheckDigit("L898902C3")).toBe(6);
    expect(mrzCheckDigit("740812")).toBe(2);
    expect(mrzCheckDigit("120415")).toBe(9);
  });

  test("passeport TD3 : champs et chiffres de controle", () => {
    const result = parseMrz(TD3)!;
    expect(result).toMatchObject({
      format: "TD3",
      documentType: "P",
      issuingCountry: "UTO",
      documentNumber: "L898902C3",
      nationality: "UTO",
      surname: "ERIKSSON",
      givenNames: "ANNA MARIA",
      birthDate: "1974-08-12",
      sex: "F",
      expiryDate: "2012-04-15",
      valid: true,
      errors: [],
    });
  });

  test("carte TD1 : trois lignes de 30", () => {
    const result = parseMrz(TD1)!;
    expect(result).toMatchObject({
      format: "TD1",
      documentType: "I",
      documentNumber: "D23145890",
      nationality: "UTO",
      surname: "ERIKSSON",
      givenNames: "ANNA MARIA",
      birthDate: "1974-08-12",
      sex: "F",
      expiryDate: "2012-04-15",
      valid: true,
    });
  });

  test("un chiffre altere est signale, une zone inconnue est refusee", () => {
    const corrupted = TD3.replace("L898902C36", "L898902C37");
    const result = parseMrz(corrupted)!;
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(["documentNumber", "composite"]);
    expect(parseMrz("P<UTO\nL898")).toBeNull();
    expect(parseMrz(TD3.toLowerCase().replace(/</g, "< "))).not.toBeNull();
  });

  test("la brique mrz refuse une zone incoherente dans le schema", () => {
    const spec = {
      type: "panel", id: "column", name: "F", configs: { uid: "r", key: "form" },
      children: [{ type: "input", dataType: "object", id: "mrz", name: "MRZ", configs: { uid: "m", key: "passeport", label: "Passeport" } }],
    } as unknown as BrickSpec;
    expect(validateFormData(spec, { passeport: parseMrz(TD3) }).valid).toBe(true);
    const bad = validateFormData(spec, { passeport: { raw: "x", valid: false, errors: ["format"] } });
    expect(bad.valid).toBe(false);
    expect(JSON.stringify(bad.errors)).toContain("Machine-readable zone");
  });
});
