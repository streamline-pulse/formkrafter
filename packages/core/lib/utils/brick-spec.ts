import type { JSONSchemaType } from "../validators/json-schema-type";
import { resolveLocalizedText } from "./localized-text";
import type { Validator } from "../validators/validator";
import type { Validation } from "../validators/validation";
import type { Rule } from "../rules/rule";
import type { BrickType } from "./brick-type";
import type { BrickBaseConfigs } from "./common-brick-props";
import type { BrickStyles } from "../utils/brick-styles";

export interface BrickSpec {
    type: BrickType;
    dataType?: JSONSchemaType;
    id: string;
    name: string;
    category?: string;
    editable?: boolean;
    unWrapData?: boolean;
    isPrivate?: boolean;

    validators?: Validator[];
    validations?: Validation[];

    rules?: Rule[];

    configsForm?: BrickSpec;

    configs?: BrickBaseConfigs & Record<string, unknown>;
    styles?: BrickStyles<string>;

    children?: BrickSpec[];
}

export function* iterateBricks(
    spec?: BrickSpec,
    path = "0"
): Generator<{ brick: BrickSpec; path: string }> {
    if (!spec) return;

    yield { brick: spec, path };

    for (const [index, child] of (spec.children ?? []).entries()) {
        yield* iterateBricks(child, `${path}.${index}`);
    }
}

export function buildValidationSchema(brickSpecs?: BrickSpec, locale?: string) {
    if (!brickSpecs) return;

    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    const requiredErrorMessage: Record<string, string | undefined> = {};
    const messageOf = (raw: unknown): string | undefined => {
        const resolved = resolveLocalizedText(raw, locale);
        return typeof resolved === "string" ? resolved : undefined;
    };

    for (const { brick } of iterateBricks(brickSpecs)) {
        const key = brick.configs?.key;
        const dataType = brick.dataType;

        if (!key || !dataType || dataType === "void") continue;

        const isRequired = brick.validations?.find(
            (validation) => validation.validator === "required"
        );

        const property: Record<string, unknown> = {
            type: dataType,
            nullable: !isRequired,
        };
        const messages: Record<string, string> = {};

        for (const validation of brick.validations ?? []) {
            const { validator, value } = validation;
            const message = messageOf(validation.message);

            if (validator === "minLength" && value != null) {
                property.minLength = Number(value);
                if (message) messages.minLength = message;
            } else if (validator === "maxLength" && value != null) {
                property.maxLength = Number(value);
                if (message) messages.maxLength = message;
            } else if (validator === "min" && value != null) {
                property.minimum = Number(value);
                if (message) messages.minimum = message;
            } else if (validator === "max" && value != null) {
                property.maximum = Number(value);
                if (message) messages.maximum = message;
            } else if (validator === "pattern" && typeof value === "string" && value) {
                property.pattern = value;
                if (message) messages.pattern = message;
            } else if (validator === "email") {
                property.format = "email";
                if (message) messages.format = message;
            } else if (validator === "url") {
                property.format = "uri";
                if (message) messages.format = message;
            }
        }

        if (Object.keys(messages).length) property.errorMessage = messages;

        properties[key] = property;

        if (isRequired) {
            required.push(key);
            requiredErrorMessage[key] = messageOf(isRequired.message);
        }
    }

    return {
        type: "object",
        properties,
        required,
        ...(Object.keys(requiredErrorMessage).length
            ? {
                errorMessage: {
                    required: requiredErrorMessage,
                },
            }
            : {}),
        additionalProperties: false,
    };
}
