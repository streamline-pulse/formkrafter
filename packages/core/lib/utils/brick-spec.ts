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

export interface PositionedBrickSpec extends BrickSpec {
    path?: string;
}

export function flattenBricksWithChildren(
    spec?: BrickSpec,
    path = "0"
): PositionedBrickSpec[] {
    if (!spec) return [];
    const flat: PositionedBrickSpec[] = [{ ...spec, path }];

    if (spec.children?.length) {
        spec.children.forEach((child, index) => {
            flat.push(...flattenBricksWithChildren(child, `${path}.${index}`));
        });
    }

    return flat;
}

export function flattenBricks(
    spec?: BrickSpec,
    path = "0"
): PositionedBrickSpec[] {
    return flattenBricksWithChildren(spec, path).map(
        ({ children: _children, ...rest }) => rest
    );
}

function comparePaths(a?: string, b?: string): number {
    const as = a?.split(".").map(Number) ?? [];
    const bs = b?.split(".").map(Number) ?? [];

    for (let i = 0; i < Math.max(as.length, bs.length); i++) {
        const diff = (as[i] ?? -1) - (bs[i] ?? -1);
        if (diff !== 0) return diff;
    }

    return 0;
}

export function unflattenBricks(
    flatList: PositionedBrickSpec[]
): BrickSpec | undefined {
    const map = new Map<string, BrickSpec>();
    const orderedList = [...flatList].sort((a, b) => comparePaths(a.path, b.path));

    orderedList.forEach(({ path, ...rest }) => {
        if (typeof path === "string") {
            map.set(path, { ...rest });
        }
    });

    orderedList.forEach(({ path }) => {
        if (typeof path !== "string" || path === "0") return;

        const parentPath = path.split(".").slice(0, -1).join(".");
        const parent = map.get(parentPath);
        const current = map.get(path);

        if (!parent || !current) return;

        if (!parent.children) {
            parent.children = [];
        }

        parent.children.push(current);
    });

    return map.get("0");
}

export function buildValidationSchema(brickSpecs?: BrickSpec) {
    if (!brickSpecs) return;

    const flatList = flattenBricks(brickSpecs);

    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    const requiredErrorMessage: Record<string, string | undefined> = {};

    flatList.forEach((positionedBrickSpec) => {
        const key = positionedBrickSpec.configs?.key;
        const dataType = positionedBrickSpec.dataType;

        if (!key || !dataType || dataType === "void") return;

        const isRequired = positionedBrickSpec.validations?.find(
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
    });

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
