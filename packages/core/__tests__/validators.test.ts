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
    expect(result.errors.age).toBe("Invalid value");
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

  test("parameterized validators enforce bounds with custom messages", () => {
    const spec: BrickSpec = {
      type: "panel",
      id: "root",
      name: "root",
      configs: { uid: "r", key: "root" },
      children: [
        {
          type: "input",
          dataType: "string",
          id: "text",
          name: "Pseudo",
          configs: { uid: "a", key: "pseudo" },
          validations: [
            { validator: "minLength", value: 3, message: "Trop court" },
            { validator: "pattern", value: "^[a-z]+$", message: "Minuscules" },
          ],
        },
        {
          type: "input",
          dataType: "number",
          id: "number",
          name: "Age",
          configs: { uid: "b", key: "age" },
          validations: [{ validator: "min", value: 18, message: "Majeur requis" }],
        },
      ],
    };

    expect(validateBrickSpecDataDetailed(spec, { pseudo: "ab", age: 12 }).errors).toEqual({
      pseudo: "Trop court",
      age: "Majeur requis",
    });
    expect(validateBrickSpecDataDetailed(spec, { pseudo: "ABC", age: 20 }).errors).toEqual({
      pseudo: "Minuscules",
    });
    expect(validateBrickSpecDataDetailed(spec, { pseudo: "abc", age: 20 }).valid).toBe(true);
  });

  test("email format validator uses ajv-formats", () => {
    const spec: BrickSpec = {
      type: "panel",
      id: "root",
      name: "root",
      configs: { uid: "r", key: "root" },
      children: [
        {
          type: "input",
          dataType: "string",
          id: "email",
          name: "Email",
          configs: { uid: "a", key: "mail" },
          validations: [{ validator: "email", message: "Email invalide" }],
        },
      ],
    };

    expect(validateBrickSpecDataDetailed(spec, { mail: "nope" }).errors).toEqual({
      mail: "Email invalide",
    });
    expect(validateBrickSpecDataDetailed(spec, { mail: "a@b.co" }).valid).toBe(true);
  });

  test("custom JS validator returns its own message", () => {
    const spec: BrickSpec = {
      type: "panel",
      id: "root",
      name: "root",
      configs: { uid: "r", key: "root" },
      children: [
        {
          type: "input",
          dataType: "string",
          id: "text",
          name: "Code",
          configs: { uid: "a", key: "code" },
          validations: [
            {
              validator: "custom",
              customValidator:
                'return value === undefined || value.startsWith("BJ-") ? true : "Doit commencer par BJ-";',
            },
          ],
        },
      ],
    };

    expect(validateBrickSpecDataDetailed(spec, { code: "FR-1" }).errors).toEqual({
      code: "Doit commencer par BJ-",
    });
    expect(validateBrickSpecDataDetailed(spec, { code: "BJ-1" }).valid).toBe(true);
  });

  test("missing messages fall back to localized defaults", () => {
    const spec = (): BrickSpec => ({
      type: "panel",
      id: "root",
      name: "root",
      configs: { uid: "r", key: "root" },
      children: [
        {
          type: "input",
          dataType: "string",
          id: "text",
          name: "Pseudo",
          configs: { uid: "a", key: "pseudo" },
          validations: [
            { validator: "required" },
            { validator: "minLength", value: 3 },
          ],
        },
      ],
    });

    expect(validateBrickSpecDataDetailed(spec(), {}).errors).toEqual({
      pseudo: "This field is required",
    });
    expect(validateBrickSpecDataDetailed(spec(), {}, "fr").errors).toEqual({
      pseudo: "Ce champ est obligatoire",
    });
    expect(validateBrickSpecDataDetailed(spec(), { pseudo: "ab" }, "fr").errors).toEqual({
      pseudo: "Minimum 3 caractères",
    });
    expect(validateBrickSpecDataDetailed(spec(), { pseudo: "ab" }).errors).toEqual({
      pseudo: "Must be at least 3 characters",
    });
  });

  test("localized validation messages resolve per locale", () => {
    const spec = (): BrickSpec => ({
      type: "panel",
      id: "root",
      name: "root",
      configs: { uid: "r", key: "root" },
      children: [
        {
          type: "input",
          dataType: "string",
          id: "text",
          name: "Name",
          configs: { uid: "a", key: "name" },
          validations: [
            {
              validator: "required",
              message: { en: "Name is required", fr: "Le nom est obligatoire" },
            },
          ],
        },
      ],
    });

    expect(validateBrickSpecDataDetailed(spec(), {}, "fr").errors).toEqual({
      name: "Le nom est obligatoire",
    });
    expect(validateBrickSpecDataDetailed(spec(), {}, "en").errors).toEqual({
      name: "Name is required",
    });
    expect(validateBrickSpecDataDetailed(spec(), {}).errors).toEqual({
      name: "Name is required",
    });
  });

  test("an invalid regex pattern does not crash validation", () => {
    const spec: BrickSpec = {
      type: "panel",
      id: "root",
      name: "root",
      configs: { uid: "r", key: "root" },
      children: [
        {
          type: "input",
          dataType: "string",
          id: "text",
          name: "Broken",
          configs: { uid: "a", key: "broken" },
          validations: [{ validator: "pattern", value: "([" }],
        },
      ],
    };

    expect(validateBrickSpecDataDetailed(spec, { broken: "x" }).valid).toBe(true);
  });
});
