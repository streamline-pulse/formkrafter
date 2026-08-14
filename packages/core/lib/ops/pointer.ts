import type { BrickSpec } from "../utils/brick-spec";

export function pointerFromPath(path: string): string {
  return path
    .split(".")
    .slice(1)
    .map((segment) => `/children/${segment}`)
    .join("");
}

export function getBrickAt(spec: BrickSpec, path: string): BrickSpec | undefined {
  const [root, ...segments] = path.split(".");
  if (root !== "0") return undefined;

  let current: BrickSpec | undefined = spec;

  for (const segment of segments) {
    if (!/^\d+$/.test(segment)) return undefined;
    current = current?.children?.[Number(segment)];
  }

  return current;
}
