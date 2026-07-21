import type { JSONSchemaType } from "../validators/json-schema-type";
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

export function buildValidationSchema(brickSpecs?: BrickSpec) {
    if (!brickSpecs) return;

    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    const requiredErrorMessage: Record<string, string | undefined> = {};

    for (const { brick } of iterateBricks(brickSpecs)) {
        const key = brick.configs?.key;
        const dataType = brick.dataType;

        if (!key || !dataType || dataType === "void") continue;

        const isRequired = brick.validations?.find(
            (validation) => validation.validator === "required"
        );

        properties[key] = {
            type: dataType,
            nullable: !isRequired,
        };

        if (isRequired) {
            required.push(key);
            requiredErrorMessage[key] = isRequired.message;
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
