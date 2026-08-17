import { describe, expect, test } from "bun:test";
import {
    appendSearchParam,
    interpolateTemplate,
    parseHeaderLines,
} from "../lib/utils/remote";
import {
    validateBrickSpecDataDetailed,
    validateFormData,
} from "../lib/validators/validator";

describe("interpolateTemplate", () => {
    test("flat tokens keep working byte-for-byte", () => {
        expect(
            interpolateTemplate(
                "{_apiBaseUrl}/forms/processes-versions/{_processVersionId}",
                { _apiBaseUrl: "https://api.example.com", _processVersionId: 42 }
            )
        ).toBe("https://api.example.com/forms/processes-versions/42");
    });

    test("dotted paths resolve through nested values", () => {
        expect(
            interpolateTemplate("/tenants/{tenant.id}/plans/{tenant.plan.name}", {
                tenant: { id: "t-1", plan: { name: "pro" } },
            })
        ).toBe("/tenants/t-1/plans/pro");
    });

    test("a flat key wins over a same-named path, so dots in keys still work", () => {
        expect(
            interpolateTemplate("{a.b}", { "a.b": "flat", a: { b: "nested" } })
        ).toBe("flat");
    });

    test("missing, undefined and null all resolve to an empty string", () => {
        expect(
            interpolateTemplate("[{nope}][{a.nope}][{u}][{n}]", {
                a: {},
                u: undefined,
                n: null,
            })
        ).toBe("[][][][]");
    });

    test("a path through a non-object resolves to an empty string", () => {
        expect(interpolateTemplate("{a.b.c}", { a: { b: 3 } })).toBe("");
    });

    test("inherited properties are not reachable", () => {
        expect(interpolateTemplate("{constructor.name}", {})).toBe("");
        expect(interpolateTemplate("{a.toString}", { a: {} })).toBe("");
    });

    test("no data map leaves every token empty", () => {
        expect(interpolateTemplate("{a}/{b.c}")).toBe("/");
    });
});

describe("parseHeaderLines", () => {
    test("interpolates values with dotted paths", () => {
        expect(
            parseHeaderLines("Authorization: Bearer {auth.token}\nX-Tenant: {tenant.id}", {
                auth: { token: "abc" },
                tenant: { id: "t-1" },
            })
        ).toEqual({ Authorization: "Bearer abc", "X-Tenant": "t-1" });
    });

    test("blank input yields no headers", () => {
        expect(parseHeaderLines("   ", {})).toBeUndefined();
        expect(parseHeaderLines(42, {})).toBeUndefined();
    });
});

describe("appendSearchParam", () => {
    test("picks the right separator and encodes the term", () => {
        expect(appendSearchParam("/a", "q", "x y")).toBe("/a?q=x%20y");
        expect(appendSearchParam("/a?p=1", "q", "x")).toBe("/a?p=1&q=x");
        expect(appendSearchParam("/a", "q", "")).toBe("/a");
    });
});

describe("rule scope during validation", () => {
    const spec = {
        type: "panel",
        id: "column",
        name: "F",
        configs: { key: "f" },
        children: [
            {
                type: "input",
                dataType: "string",
                id: "text",
                name: "Seats",
                configs: { key: "seats" },
                validations: [{ validator: "required" }],
                rules: [
                    {
                        name: "pro only",
                        type: "jsonLogic",
                        logic: { "!=": [{ var: "tenant.plan" }, "pro"] },
                        effects: [
                            { property: { target: "hidden", type: "boolean" }, boolean: true },
                        ],
                    },
                ],
            },
        ],
    } as never;

    test("a rule driven by context sees it when the scope is passed", () => {
        expect(
            validateBrickSpecDataDetailed(spec, {}, undefined, {
                tenant: { plan: "pro" },
            }).valid
        ).toBe(false);

        expect(
            validateBrickSpecDataDetailed(spec, {}, undefined, {
                tenant: { plan: "free" },
            }).valid
        ).toBe(true);
    });

    test("without a scope the rule cannot see context and the field reads as hidden", () => {
        expect(validateBrickSpecDataDetailed(spec, {}).valid).toBe(true);
    });

    test("validateFormData merges the scope over the payload", () => {
        expect(
            validateFormData(spec, {}, undefined, { tenant: { plan: "pro" } }).valid
        ).toBe(false);
    });
});
