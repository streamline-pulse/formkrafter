import type { Operation } from "fast-json-patch";
import type { BrickSpec } from "../utils/brick-spec";

const mapBricks = (
    spec: BrickSpec,
    configsOf: (spec: BrickSpec) => BrickSpec["configs"]
): BrickSpec => {
    const configs = configsOf(spec);
    const children = spec.children?.map((child) => mapBricks(child, configsOf));

    if (configs === spec.configs && children === spec.children) return spec;

    const next: BrickSpec = { ...spec };
    if (configs === undefined) delete next.configs;
    else next.configs = configs;
    if (children) next.children = children;
    return next;
};

export function ensureBrickUids(spec: BrickSpec): BrickSpec {
    return mapBricks(spec, (brick) =>
        brick.configs?.uid
            ? brick.configs
            : { ...brick.configs, uid: crypto.randomUUID() }
    );
}

export function stripBrickUids(spec: BrickSpec): BrickSpec {
    return mapBricks(spec, (brick) => {
        if (!brick.configs || !("uid" in brick.configs)) return brick.configs;
        const { uid: _uid, ...rest } = brick.configs;
        return Object.keys(rest).length > 0
            ? (rest as BrickSpec["configs"])
            : undefined;
    });
}

const isBrickSpecLike = (value: unknown): value is BrickSpec =>
    value != null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as BrickSpec).type === "string" &&
    typeof (value as BrickSpec).id === "string";

const withoutUid = (configs: Record<string, unknown>): Record<string, unknown> => {
    const { uid: _uid, ...rest } = configs;
    return rest;
};

const stripPatchValue = (value: unknown, path: string): unknown => {
    if (Array.isArray(value)) {
        return value.map((item) => stripPatchValue(item, path));
    }
    if (isBrickSpecLike(value)) return stripBrickUids(value);
    if (
        path.endsWith("/configs") &&
        value != null &&
        typeof value === "object"
    ) {
        return withoutUid(value as Record<string, unknown>);
    }
    return value;
};

export function stripUidsFromPatches(patches: Operation[]): Operation[] {
    return patches.map((patch) =>
        "value" in patch
            ? ({
                  ...patch,
                  value: stripPatchValue(patch.value, patch.path),
              } as Operation)
            : patch
    );
}
