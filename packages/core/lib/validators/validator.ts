import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";
import ajvErrors from "ajv-errors";
import type { BrickSpec } from "../utils/brick-spec";
import { buildValidationSchema } from "../utils/brick-spec";

const ajv = new Ajv({ allErrors: true });
ajvErrors(ajv);

const validatorCache = new WeakMap<BrickSpec, ValidateFunction>();

export type Validator = "required" | "custom";

export type ValidationResult = {
    valid: boolean;
    errors: Record<string, string>;
};

const compiledValidator = (brickSpec: BrickSpec): ValidateFunction | undefined => {
    let validate = validatorCache.get(brickSpec);

    if (!validate) {
        const schema = buildValidationSchema(brickSpec);
        if (!schema) return undefined;

        validate = ajv.compile(schema);
        validatorCache.set(brickSpec, validate);
    }

    return validate;
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
    data: unknown
): ValidationResult => {
    const validate = compiledValidator(brickSpec);
    if (!validate) return { valid: true, errors: {} };

    const valid = validate(data);
    const errors: Record<string, string> = {};

    if (!valid) {
        for (const error of validate.errors ?? []) {
            const key = keyOfError(error);
            if (key && !(key in errors) && error.message) {
                errors[key] = error.message;
            }
        }
    }

    return { valid, errors };
};

export const validateBrickSpecData = (brickSpec: BrickSpec, data: unknown): boolean =>
    validateBrickSpecDataDetailed(brickSpec, data).valid;
