import type { BrickSpec } from "../utils/brick-spec";

export function pointerFromPath(path: string): string {
  return path
    .split(".")
    .slice(1)
    .map((segment) => `/children/${segment}`)
    .join("");
}

export function pointerOfUid(spec: BrickSpec, uid: string): string | undefined {
  if (spec.configs?.uid === uid) return "";

  for (const [index, child] of (spec.children ?? []).entries()) {
    const childPointer = pointerOfUid(child, uid);
    if (childPointer !== undefined) return `/children/${index}${childPointer}`;
  }

  return undefined;
}

export function getBrickAt(spec: BrickSpec, path: string): BrickSpec | undefined {
  let current: BrickSpec | undefined = spec;

  for (const segment of path.split(".").slice(1)) {
    current = current?.children?.[Number(segment)];
  }

  return current;
}
