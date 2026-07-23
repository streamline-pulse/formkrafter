import type { BrickSpec } from "./brick-spec";
import { iterateBricks } from "./brick-spec";
import { services } from "../services";
import type { SpecSourceService } from "../services/spec_source_service";

export interface ExpandSpecOptions {
  specSourceService?: SpecSourceService;
  maxDepth?: number;
}

const isNestedForm = (brick: BrickSpec): boolean =>
  brick.id === "nested-form" && typeof brick.configs?.specRef === "string";

export const hasNestedForms = (spec?: BrickSpec): boolean => {
  if (!spec) return false;
  for (const { brick } of iterateBricks(spec)) {
    if (isNestedForm(brick) && brick.configs?.specRef) return true;
  }
  return false;
};

export async function expandSpec(
  spec: BrickSpec,
  options: ExpandSpecOptions = {}
): Promise<BrickSpec> {
  const source = options.specSourceService ?? services.specSourceService;
  const maxDepth = options.maxDepth ?? 5;

  const expandBrick = async (
    brick: BrickSpec,
    seenRefs: string[]
  ): Promise<BrickSpec> => {
    if (isNestedForm(brick) && brick.configs?.specRef) {
      const ref = String(brick.configs.specRef);

      if (seenRefs.includes(ref)) {
        throw new Error(
          `Circular nested form reference: ${[...seenRefs, ref].join(" → ")}`
        );
      }
      if (seenRefs.length >= maxDepth) {
        throw new Error(
          `Nested forms exceed the maximum depth of ${maxDepth} (${ref})`
        );
      }

      const fetched = await source.fetchSpec(ref);
      const inlined = await expandBrick(structuredClone(fetched), [
        ...seenRefs,
        ref,
      ]);

      return {
        type: "panel",
        id: "group",
        name: brick.name,
        configs: {
          ...brick.configs,
          label: brick.configs.label ?? inlined.name,
        },
        styles: brick.styles,
        rules: brick.rules,
        children: inlined.children ?? [],
      };
    }

    if (!brick.children?.length) return brick;

    return {
      ...brick,
      children: await Promise.all(
        brick.children.map((child) => expandBrick(child, seenRefs))
      ),
    };
  };

  return expandBrick(structuredClone(spec), []);
}
