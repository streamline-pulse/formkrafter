import { Ajv, type ValidateFunction } from "ajv";
import ajvErrors from "ajv-errors";
import type { BrickSpec } from "../utils/brick-spec";
import { buildValidationSchema } from "../utils/brick-spec";

const ajv = new Ajv({ allErrors: true });
ajvErrors(ajv);

const validatorCache = new WeakMap<BrickSpec, ValidateFunction>();

export type Validator = "required" | "custom";

export const validateBrickSpecData = (brickSpec: BrickSpec, data: unknown): boolean => {
    let validate = validatorCache.get(brickSpec);

    if (!validate) {
        const schema = buildValidationSchema(brickSpec);
        if (!schema) return true;

        validate = ajv.compile(schema);
        validatorCache.set(brickSpec, validate);
    }

    return validate(data);
}
