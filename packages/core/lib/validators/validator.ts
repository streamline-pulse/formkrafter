import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";
import ajvErrors from "ajv-errors";
import addFormats from "ajv-formats";
import type { BrickSpec } from "../utils/brick-spec";
import { buildValidationSchema, iterateSchemaBricks } from "../utils/brick-spec";
import { resolveLocalizedText } from "../utils/localized-text";
import { defaultValidationMessage } from "./default-messages";
import { evalBrickCode } from "../brick/utils";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv, ["email", "uri"]);
ajvErrors(ajv);

const validatorCache = new WeakMap<BrickSpec, Map<string, ValidateFunction>>();

export type Validator =
    | "required"
    | "minLength"
    | "maxLength"
    | "min"
    | "max"
    | "pattern"
    | "minItems"
    | "maxItems"
    | "email"
    | "url"
    | "custom";

export type ValidationResult = {
    valid: boolean;
    errors: Record<string, string>;
};

const compiledValidator = (
    brickSpec: BrickSpec,
    locale?: string
): ValidateFunction | undefined => {
    let byLocale = validatorCache.get(brickSpec);
    if (!byLocale) {
        byLocale = new Map();
        validatorCache.set(brickSpec, byLocale);
    }

    const cacheKey = locale ?? "";
    let validate = byLocale.get(cacheKey);

    if (!validate) {
        const schema = buildValidationSchema(brickSpec, locale);
        if (!schema) return undefined;

        try {
            validate = ajv.compile(schema);
        } catch {
            return undefined;
        }
        byLocale.set(cacheKey, validate);
    }

    return validate;
};

const customErrors = (
    brickSpec: BrickSpec,
    data: unknown,
    locale?: string
): Record<string, string> => {
    const errors: Record<string, string> = {};
    const dataMap = (data ?? {}) as Record<string, unknown>;

    for (const brick of iterateSchemaBricks(brickSpec)) {
        const key = brick.configs?.key;
        if (!key) continue;

        for (const validation of brick.validations ?? []) {
            if (validation.validator !== "custom" || !validation.customValidator) {
                continue;
            }

            const result = evalBrickCode(
                `const value = dataMap?.[${JSON.stringify(key)}];\n${validation.customValidator}`,
                dataMap
            );

            if (result === true || result === undefined || result === null) continue;
            if (key in errors) continue;

            if (typeof result === "string") errors[key] = result;
            else if (result instanceof Error) errors[key] = result.message;
            else {
                const resolved = resolveLocalizedText(validation.message, locale);
                errors[key] =
                    typeof resolved === "string"
                        ? resolved
                        : defaultValidationMessage("custom", locale);
            }
        }
    }

    return errors;
};

const keyOfError = (error: ErrorObject): string | undefined => {
    if (error.keyword === "required") {
        return (error.params as { missingProperty?: string }).missingProperty;
    }

    if (error.keyword === "errorMessage") {
        const inner = (error.params as { errors?: ErrorObject[] }).errors?.[0];
        return inner ? keyOfError(inner) : undefined;
    }

    return error.instancePath.split("/").filter(Boolean)[0];
};

export const validateBrickSpecDataDetailed = (
    brickSpec: BrickSpec,
    data: unknown,
    locale?: string
): ValidationResult => {
    const errors: Record<string, string> = {};
    const validate = compiledValidator(brickSpec, locale);

    if (validate && !validate(data)) {
        for (const error of validate.errors ?? []) {
            const key = keyOfError(error);
            if (key && !(key in errors) && error.message) {
                errors[key] = error.message;
            }
        }
    }

    for (const [key, message] of Object.entries(customErrors(brickSpec, data, locale))) {
        if (!(key in errors)) errors[key] = message;
    }

    return { valid: Object.keys(errors).length === 0, errors };
};

export const validateBrickSpecData = (
    brickSpec: BrickSpec,
    data: unknown,
    locale?: string
): boolean => validateBrickSpecDataDetailed(brickSpec, data, locale).valid;

const stripEmpty = (data: unknown): Record<string, unknown> => {
    if (typeof data !== "object" || data === null) return {};

    return Object.fromEntries(
        Object.entries(data as Record<string, unknown>).filter(
            ([, value]) => value !== "" && value !== null && value !== undefined
        )
    );
};

const rowSpecCache = new WeakMap<BrickSpec, BrickSpec>();

const rowSpecOf = (collection: BrickSpec): BrickSpec => {
    let rowSpec = rowSpecCache.get(collection);

    if (!rowSpec) {
        rowSpec = {
            type: "panel",
            id: "collection-row",
            name: "Row",
            configs: { key: `${collection.configs?.key ?? "collection"}_row` },
            children: collection.children ?? [],
        };
        rowSpecCache.set(collection, rowSpec);
    }

    return rowSpec;
};

export const validateFormData = (
    brickSpec: BrickSpec,
    data: unknown,
    locale?: string
): ValidationResult => {
    const present = stripEmpty(data);
    const errors = {
        ...validateBrickSpecDataDetailed(brickSpec, present, locale).errors,
    };

    for (const brick of iterateSchemaBricks(brickSpec)) {
        if (brick.type !== "collection") continue;

        const key = brick.configs?.key;
        if (!key) continue;

        const rows = present[key];
        if (!Array.isArray(rows)) continue;

        const rowSpec = rowSpecOf(brick);
        rows.forEach((row, index) => {
            const rowResult = validateFormData(rowSpec, row, locale);
            for (const [field, message] of Object.entries(rowResult.errors)) {
                const prefixed = `${key}[${index}].${field}`;
                if (!(prefixed in errors)) errors[prefixed] = message;
            }
        });
    }

    return { valid: Object.keys(errors).length === 0, errors };
};
