import type { JSONSchemaType } from "../validators/json-schema-type.js";
import { resolveLocalizedText } from "./localized-text.js";
import { defaultValidationMessage } from "../validators/default-messages.js";
import type { Validator } from "../validators/validator.js";
import type { Validation } from "../validators/validation.js";
import type { Rule } from "../rules/rule.js";
import type { BrickType } from "./brick-type.js";
import type { BrickBaseConfigs } from "./common-brick-props.js";
import type { BrickStyles } from "../utils/brick-styles.js";

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

export function defaultFormData(
    spec?: BrickSpec
): Record<string, unknown> {
    const defaults: Record<string, unknown> = {};

    for (const brick of iterateSchemaBricks(spec)) {
        const key = brick.configs?.key;
        const value = brick.configs?.defaultValue;
        if (key && value !== undefined && !(key in defaults)) {
            defaults[key] = value;
        }
    }

    return defaults;
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
        const dataType =
            brick.configs?.multiple === true && brick.dataType === "object"
                ? "array"
                : brick.dataType;

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
            } else if (validator === "minItems" && value != null) {
                property.minItems = Number(value);
                messages.minItems = message;
            } else if (validator === "maxItems" && value != null) {
                property.maxItems = Number(value);
                messages.maxItems = message;
            } else if (validator === "email") {
                property.format = "email";
                messages.format = message;
            } else if (validator === "url") {
                property.format = "uri";
                messages.format = message;
            }
        }

        // Briques identite : la regle vient de la brique, pas d'une validation a cocher.
        if (brick.id === "iban") {
            property.format = "identity-iban";
            messages.format = defaultValidationMessage("iban", locale);
        }
        if ((brick.id === "national-id" || brick.id === "tax-id") && typeof brick.configs?.idFormat === "string" && brick.configs.idFormat) {
            property.format = `identity-${brick.configs.idFormat}`;
            messages.format = defaultValidationMessage("identity", locale);
        }
        if (brick.id === "mrz") {
            property.mrzValid = true;
            messages.mrzValid = defaultValidationMessage("mrz", locale);
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
