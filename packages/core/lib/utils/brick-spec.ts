import type { JSONSchemaType } from "../validators/json-schema-type";
import { resolveLocalizedText } from "./localized-text";
import { defaultValidationMessage } from "../validators/default-messages";
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

export function* iterateSchemaBricks(spec?: BrickSpec): Generator<BrickSpec> {
    if (!spec) return;

    yield spec;

    if (spec.type === "collection") return;

    for (const child of spec.children ?? []) {
        yield* iterateSchemaBricks(child);
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

    for (const brick of iterateSchemaBricks(brickSpecs)) {
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
        const messages: Record<string, string> = {
            type: defaultValidationMessage("type", locale),
        };

        for (const validation of brick.validations ?? []) {
            const { validator, value } = validation;
            const message =
                messageOf(validation.message) ??
                defaultValidationMessage(validator, locale, value);

            if (validator === "minLength" && value != null) {
                property.minLength = Number(value);
                messages.minLength = message;
            } else if (validator === "maxLength" && value != null) {
                property.maxLength = Number(value);
                messages.maxLength = message;
            } else if (validator === "min" && value != null) {
                property.minimum = Number(value);
                messages.minimum = message;
            } else if (validator === "max" && value != null) {
                property.maximum = Number(value);
                messages.maximum = message;
            } else if (validator === "pattern" && typeof value === "string" && value) {
                property.pattern = value;
                messages.pattern = message;
            } else if (validator === "email") {
                property.format = "email";
                messages.format = message;
            } else if (validator === "url") {
                property.format = "uri";
                messages.format = message;
            }
        }

        property.errorMessage = messages;

        properties[key] = property;

        if (isRequired) {
            required.push(key);
            requiredErrorMessage[key] =
                messageOf(isRequired.message) ??
                defaultValidationMessage("required", locale);
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
