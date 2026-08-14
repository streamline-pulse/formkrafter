import { iterateBricks } from "./brick-spec";
import type { BrickSpec } from "./brick-spec";

export type SpecIssueCode =
    | "validations-without-data-type"
    | "input-without-key"
    | "duplicate-key"
    | "collection-without-children";

export interface SpecIssue {
    code: SpecIssueCode;
    path: string;
    key?: string;
    message: string;
}

const isDataCarrying = (brick: BrickSpec): boolean =>
    brick.type === "input" || brick.type === "collection";

export function lintSpec(spec?: BrickSpec): SpecIssue[] {
    if (!spec) return [];

    const issues: SpecIssue[] = [];
    const seen = new Map<string, string>();

    for (const { brick, path } of iterateBricks(spec)) {
        const key = brick.configs?.key;

        if (isDataCarrying(brick)) {
            if (!key) {
                issues.push({
                    code: "input-without-key",
                    path,
                    message: `${brick.type} brick "${brick.id}" has no configs.key — it carries no data and is skipped by validation`,
                });
            } else if (!brick.dataType || brick.dataType === "void") {
                if (brick.validations?.length) {
                    issues.push({
                        code: "validations-without-data-type",
                        path,
                        key,
                        message: `"${key}" declares ${brick.validations.length} validation(s) but has no dataType — they are silently skipped, on the client and on the server`,
                    });
                }
            }
        }

        if (key && isDataCarrying(brick)) {
            const previous = seen.get(key);
            if (previous) {
                issues.push({
                    code: "duplicate-key",
                    path,
                    key,
                    message: `key "${key}" is used by two bricks (${previous} and ${path}) — their values collide in the form data`,
                });
            } else {
                seen.set(key, path);
            }
        }

        if (brick.type === "collection" && !brick.children?.length) {
            issues.push({
                code: "collection-without-children",
                path,
                key,
                message: `collection "${key ?? brick.id}" has no row template — it can never produce data`,
            });
        }
    }

    return issues;
}

const warningCache = new WeakMap<BrickSpec, string[]>();

export function validationWarnings(spec?: BrickSpec): string[] {
    if (!spec) return [];

    let warnings = warningCache.get(spec);
    if (!warnings) {
        warnings = lintSpec(spec)
            .filter((issue) => issue.code === "validations-without-data-type")
            .map((issue) => issue.message);
        warningCache.set(spec, warnings);
    }
    return warnings;
}
