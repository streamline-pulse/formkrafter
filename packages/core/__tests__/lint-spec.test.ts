import { describe, expect, test } from "bun:test";
import { lintSpec } from "../lib/utils/lint-spec";
import { validateFormData } from "../lib/validators/validator";
import type { BrickSpec } from "../lib/utils/brick-spec";

const spec = (children: unknown[]): BrickSpec =>
    ({
        type: "panel",
        id: "column",
        name: "Form",
        configs: { key: "form" },
        children,
    }) as unknown as BrickSpec;

const input = (over: Record<string, unknown> = {}) => ({
    type: "input",
    dataType: "string",
    id: "text",
    name: "Text",
    configs: { key: "name" },
    ...over,
});

describe("lintSpec", () => {
    test("a clean spec reports nothing", () => {
        expect(
            lintSpec(spec([input({ validations: [{ validator: "required" }] })]))
        ).toEqual([]);
    });

    test("validations without dataType are reported with their key", () => {
        const issues = lintSpec(
            spec([
                {
                    type: "input",
                    id: "text",
                    name: "Text",
                    configs: { key: "name" },
                    validations: [{ validator: "required" }],
                },
            ])
        );

        expect(issues).toHaveLength(1);
        expect(issues[0].code).toBe("validations-without-data-type");
        expect(issues[0].key).toBe("name");
        expect(issues[0].path).toBe("0.0");
    });

    test("a missing dataType without validations is not worth reporting", () => {
        const issues = lintSpec(
            spec([{ type: "input", id: "text", name: "Text", configs: { key: "n" } }])
        );
        expect(issues).toEqual([]);
    });

    test("keyless inputs and duplicate keys are reported", () => {
        const issues = lintSpec(
            spec([
                input({ configs: {} }),
                input({ configs: { key: "dup" } }),
                input({ configs: { key: "dup" } }),
            ])
        );

        expect(issues.map((issue) => issue.code)).toEqual([
            "input-without-key",
            "duplicate-key",
        ]);
    });

    test("an empty collection is reported", () => {
        const issues = lintSpec(
            spec([
                {
                    type: "collection",
                    dataType: "array",
                    id: "data-grid",
                    name: "Data grid",
                    configs: { key: "rows" },
                },
            ])
        );

        expect(issues.map((issue) => issue.code)).toEqual([
            "collection-without-children",
        ]);
    });
});

describe("validateFormData warnings", () => {
    test("silently skipped validations surface as a warning", () => {
        const result = validateFormData(
            spec([
                {
                    type: "input",
                    id: "text",
                    name: "Text",
                    configs: { key: "name" },
                    validations: [{ validator: "required" }],
                },
            ]),
            {}
        );

        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings?.[0]).toContain("no dataType");
    });

    test("a healthy spec carries no warnings key at all", () => {
        const result = validateFormData(
            spec([input({ validations: [{ validator: "required" }] })]),
            {}
        );

        expect(result.valid).toBe(false);
        expect(result.warnings).toBeUndefined();
    });
});

describe("schema compile failures", () => {
    test("a schema that cannot compile surfaces as a warning instead of passing silently", () => {
        const broken = spec([
            {
                type: "input",
                dataType: "string",
                id: "text",
                name: "Text",
                configs: { key: "nom" },
                validations: [{ validator: "pattern", value: "(" }],
            },
        ]);

        const result = validateFormData(broken, {});
        expect(result.warnings?.some((w) => w.includes("failed to compile"))).toBe(
            true
        );
    });
});
