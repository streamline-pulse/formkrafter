import { describe, expect, test } from "bun:test";
import { expandSpec, hasNestedForms } from "../lib/utils/expand-spec";
import { validateFormData } from "../lib/validators/validator";
import type { BrickSpec } from "../lib/utils/brick-spec";
import type { SpecSourceService } from "../lib/services/spec_source_service";

const addressSpec: BrickSpec = {
  type: "panel",
  id: "column",
  name: "Address",
  configs: { uid: "addr-root", key: "addressForm" },
  children: [
    {
      type: "input",
      dataType: "string",
      id: "text",
      name: "Street",
      configs: { uid: "addr-street", key: "street", label: "Street" },
      validations: [{ validator: "required" }],
    },
    {
      type: "input",
      dataType: "string",
      id: "text",
      name: "City",
      configs: { uid: "addr-city", key: "city", label: "City" },
    },
  ],
};

const sourceOf = (
  specs: Record<string, BrickSpec>
): SpecSourceService => ({
  fetchSpec: async (ref) => {
    const found = specs[ref];
    if (!found) throw new Error(`unknown ref ${ref}`);
    return found;
  },
});

const host = (specRef: string): BrickSpec => ({
  type: "panel",
  id: "column",
  name: "Host",
  configs: { uid: "host-root", key: "host" },
  children: [
    {
      type: "input",
      dataType: "string",
      id: "text",
      name: "Name",
      configs: { uid: "h-name", key: "name" },
    },
    {
      type: "panel",
      id: "nested-form",
      name: "Nested form",
      configs: { uid: "h-nested", key: "delivery", label: "Delivery", specRef },
    },
  ],
});

describe("expandSpec", () => {
  test("hasNestedForms detects refs", () => {
    expect(hasNestedForms(host("address"))).toBe(true);
    expect(hasNestedForms(addressSpec)).toBe(false);
  });

  test("inlines the referenced spec as a labelled group", async () => {
    const expanded = await expandSpec(host("address"), {
      specSourceService: sourceOf({ address: addressSpec }),
    });

    const group = expanded.children?.[1];
    expect(group?.id).toBe("group");
    expect(group?.configs?.label).toBe("Delivery");
    expect(group?.children?.map((child) => child.configs?.key)).toEqual([
      "street",
      "city",
    ]);

    const verdict = validateFormData(expanded, { name: "Ada" }, "en");
    expect(verdict.errors.street).toBe("This field is required");
  });

  test("supports nesting a form inside a nested form", async () => {
    const middle: BrickSpec = {
      type: "panel",
      id: "column",
      name: "Middle",
      configs: { uid: "mid-root", key: "middle" },
      children: [
        {
          type: "panel",
          id: "nested-form",
          name: "Nested form",
          configs: { uid: "mid-nested", key: "inner", specRef: "address" },
        },
      ],
    };

    const expanded = await expandSpec(host("middle"), {
      specSourceService: sourceOf({ middle, address: addressSpec }),
    });

    const outer = expanded.children?.[1];
    const inner = outer?.children?.[0];
    expect(inner?.id).toBe("group");
    expect(inner?.children?.[0]?.configs?.key).toBe("street");
  });

  test("rejects circular references", async () => {
    const loop: BrickSpec = {
      type: "panel",
      id: "column",
      name: "Loop",
      configs: { uid: "loop-root", key: "loop" },
      children: [
        {
          type: "panel",
          id: "nested-form",
          name: "Nested form",
          configs: { uid: "loop-nested", key: "again", specRef: "loop" },
        },
      ],
    };

    expect(
      expandSpec(host("loop"), {
        specSourceService: sourceOf({ loop }),
      })
    ).rejects.toThrow("Circular nested form reference");
  });

  test("enforces the depth limit", async () => {
    const chain: Record<string, BrickSpec> = {};
    for (let i = 0; i < 8; i++) {
      chain[`level-${i}`] = {
        type: "panel",
        id: "column",
        name: `Level ${i}`,
        configs: { uid: `lvl-${i}`, key: `level${i}` },
        children: [
          {
            type: "panel",
            id: "nested-form",
            name: "Nested form",
            configs: {
              uid: `lvl-${i}-nested`,
              key: `next${i}`,
              specRef: `level-${i + 1}`,
            },
          },
        ],
      };
    }

    expect(
      expandSpec(host("level-0"), {
        specSourceService: sourceOf(chain),
        maxDepth: 3,
      })
    ).rejects.toThrow("maximum depth");
  });

  test("surfaces unknown refs", () => {
    expect(
      expandSpec(host("missing"), {
        specSourceService: sourceOf({}),
      })
    ).rejects.toThrow("unknown ref missing");
  });
});
