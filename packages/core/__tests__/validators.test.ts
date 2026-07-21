import { describe, expect, test } from "bun:test";
import type { BrickSpec } from "../lib/utils/brick-spec";
import {
  validateBrickSpecData,
  validateBrickSpecDataDetailed,
} from "../lib/validators/validator";

const form = (): BrickSpec => ({
  type: "panel",
  id: "root",
  name: "root",
  configs: { uid: "r", key: "root" },
  children: [
    {
      type: "input",
      dataType: "string",
      id: "text",
      name: "Email",
      configs: { uid: "a", key: "email" },
      validations: [{ validator: "required", message: "Email obligatoire" }],
    },
    {
      type: "input",
      dataType: "number",
      id: "number",
      name: "Age",
      configs: { uid: "b", key: "age" },
    },
  ],
});

describe("validateBrickSpecDataDetailed", () => {
  test("maps required errors to the field key with the custom message", () => {
    const result = validateBrickSpecDataDetailed(form(), {});
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual({ email: "Email obligatoire" });
  });

  test("maps type errors to the field key", () => {
    const result = validateBrickSpecDataDetailed(form(), {
      email: "x",
      age: "abc",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.age).toBe("must be number");
    expect(result.errors.email).toBeUndefined();
  });

  test("returns no errors for valid data", () => {
    const result = validateBrickSpecDataDetailed(form(), {
      email: "x",
      age: 30,
    });
    expect(result).toEqual({ valid: true, errors: {} });
  });

  test("boolean variant stays consistent", () => {
    expect(validateBrickSpecData(form(), {})).toBe(false);
    expect(validateBrickSpecData(form(), { email: "x" })).toBe(true);
  });
});
