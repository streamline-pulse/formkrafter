import { applyPatch, type Operation } from "fast-json-patch";
import type { BrickSpec } from "../utils/brick-spec";
import type { BrickBaseConfigs } from "../utils/common-brick-props";
import type { BrickStyles } from "../utils/brick-styles";
import type { Validation } from "../validators/validation";
import type { Rule } from "../rules/rule";
import { getBrickAt, pointerFromPath, pointerOfUid } from "./pointer";

export type SpecUpdate = {
  spec: BrickSpec;
  patches: Operation[];
  inverse: Operation[];
};

const apply = (
  spec: BrickSpec,
  patches: Operation[],
  inverse: Operation[]
): SpecUpdate => ({
  spec: applyPatch(spec, patches, true, false).newDocument,
  patches,
  inverse,
});

const requireBrickAt = (spec: BrickSpec, path: string): BrickSpec => {
  const brick = getBrickAt(spec, path);
  if (!brick) throw new Error(`No brick at path "${path}"`);
  return brick;
};

const requireBrickByUid = (
  spec: BrickSpec,
  uid: string
): { pointer: string; brick: BrickSpec } => {
  const pointer = pointerOfUid(spec, uid);
  if (pointer === undefined) throw new Error(`No brick with uid "${uid}"`);

  let brick = spec;
  for (const segment of pointer.split("/children/").slice(1)) {
    brick = brick.children![Number(segment)];
  }

  return { pointer, brick };
};

const toJsonValue = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export function addBrick(
  spec: BrickSpec,
  brick: BrickSpec,
  parentPath: string,
  index?: number
): SpecUpdate {
  const parent = requireBrickAt(spec, parentPath);
  const parentPointer = pointerFromPath(parentPath);
  const value = toJsonValue(brick);

  if (!parent.children) {
    const pointer = `${parentPointer}/children`;
    return apply(
      spec,
      [{ op: "add", path: pointer, value: [value] }],
      [{ op: "remove", path: pointer }]
    );
  }

  const position = Math.min(index ?? parent.children.length, parent.children.length);
  const pointer = `${parentPointer}/children/${position}`;

  return apply(
    spec,
    [{ op: "add", path: pointer, value }],
    [{ op: "remove", path: pointer }]
  );
}

export function removeBrick(spec: BrickSpec, path: string): SpecUpdate {
  if (path === "0") throw new Error("Cannot remove the root brick");

  const brick = requireBrickAt(spec, path);
  const pointer = pointerFromPath(path);

  return apply(
    spec,
    [{ op: "remove", path: pointer }],
    [{ op: "add", path: pointer, value: brick }]
  );
}

export function moveBrick(spec: BrickSpec, from: string, to: string): SpecUpdate {
  if (from === "0" || to === "0") throw new Error("Cannot move the root brick");

  const brick = requireBrickAt(spec, from);

  const fromSegments = from.split(".").map(Number);
  const toSegments = to.split(".").map(Number);
  const parentLength = fromSegments.length - 1;
  const fromIndex = fromSegments[parentLength];

  const sharesFromParent =
    toSegments.length > parentLength &&
    fromSegments.slice(0, parentLength).every((segment, i) => segment === toSegments[i]);

  const adjusted = [...toSegments];
  if (sharesFromParent) {
    if (adjusted[parentLength] === fromIndex && adjusted.length > fromSegments.length) {
      throw new Error(`Cannot move a brick into its own subtree ("${from}" → "${to}")`);
    }
    if (adjusted[parentLength] > fromIndex) adjusted[parentLength] -= 1;
  }

  const fromPointer = pointerFromPath(from);
  const toPointer = pointerFromPath(adjusted.join("."));

  return apply(
    spec,
    [
      { op: "remove", path: fromPointer },
      { op: "add", path: toPointer, value: brick },
    ],
    [
      { op: "remove", path: toPointer },
      { op: "add", path: fromPointer, value: brick },
    ]
  );
}

const withFreshUids = (brick: BrickSpec): BrickSpec => ({
  ...brick,
  ...(brick.configs
    ? { configs: { ...brick.configs, uid: crypto.randomUUID() } }
    : {}),
  ...(brick.children ? { children: brick.children.map(withFreshUids) } : {}),
});

export function duplicateBrick(spec: BrickSpec, path: string): SpecUpdate {
  if (path === "0") throw new Error("Cannot duplicate the root brick");

  const brick = requireBrickAt(spec, path);
  const segments = path.split(".");
  const nextIndex = Number(segments[segments.length - 1]) + 1;
  const pointer = pointerFromPath(
    [...segments.slice(0, -1), String(nextIndex)].join(".")
  );

  const copy = withFreshUids(toJsonValue(brick));

  return apply(
    spec,
    [{ op: "add", path: pointer, value: copy }],
    [{ op: "remove", path: pointer }]
  );
}

const setBrickSection = (
  spec: BrickSpec,
  brickPointer: string,
  section: "configs" | "styles" | "validations" | "rules",
  value: unknown,
  previous: unknown
): SpecUpdate => {
  const pointer = `${brickPointer}/${section}`;

  if (previous === undefined) {
    return apply(
      spec,
      [{ op: "add", path: pointer, value }],
      [{ op: "remove", path: pointer }]
    );
  }

  return apply(
    spec,
    [{ op: "replace", path: pointer, value }],
    [{ op: "replace", path: pointer, value: previous }]
  );
};

export function updateBrickConfigs(
  spec: BrickSpec,
  uid: string,
  configs: BrickBaseConfigs & Record<string, unknown>
): SpecUpdate {
  const { pointer, brick } = requireBrickByUid(spec, uid);
  const merged = { ...brick.configs, ...configs };

  return setBrickSection(spec, pointer, "configs", merged, brick.configs);
}

export function updateBrickStyles(
  spec: BrickSpec,
  uid: string,
  styles: BrickStyles<string>
): SpecUpdate {
  const { pointer, brick } = requireBrickByUid(spec, uid);
  const merged = { ...brick.styles, ...styles };

  return setBrickSection(spec, pointer, "styles", merged, brick.styles);
}

export function updateBrickValidations(
  spec: BrickSpec,
  uid: string,
  validations: Validation[]
): SpecUpdate {
  const { pointer, brick } = requireBrickByUid(spec, uid);

  return setBrickSection(spec, pointer, "validations", validations, brick.validations);
}

export function updateBrickRules(
  spec: BrickSpec,
  uid: string,
  rules: Rule[]
): SpecUpdate {
  const { pointer, brick } = requireBrickByUid(spec, uid);

  return setBrickSection(spec, pointer, "rules", rules, brick.rules);
}
