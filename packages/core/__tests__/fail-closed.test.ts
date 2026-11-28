import { describe, expect, test } from "bun:test";
import type { BrickSpec } from "../lib/utils/brick-spec";
import {
    SCHEMA_ERROR_KEY,
    validateBrickSpecData,
    validateBrickSpecDataDetailed,
    validateFormData,
    validationSchemaFailure,
} from "../lib/validators/validator";
import { linearRegExp, MAX_PATTERN_PROGRAM } from "../lib/validators/linear-regexp";
import { runSandboxed } from "../lib/services/sandbox-interpreter";

const root = (children: BrickSpec[]): BrickSpec => ({
    type: "panel",
    id: "root",
    name: "Root",
    configs: { key: "root" },
    children,
});

const text = (key: string, validations: BrickSpec["validations"], extra: Partial<BrickSpec> = {}): BrickSpec => ({
    type: "input",
    dataType: "string",
    id: "text",
    name: key,
    configs: { key },
    validations,
    ...extra,
});

const required = { validator: "required" as const };

describe("a schema that does not compile fails closed", () => {
    const triggers: [string, BrickSpec][] = [
        ["an invalid pattern", root([text("a", [required, { validator: "pattern", value: "([a-z" }])])],
        ["a non-numeric minLength", root([text("a", [required, { validator: "minLength", value: "abc" }])])],
        ["a non-numeric max", root([text("a", [required]), text("n", [{ validator: "max", value: "ten" }], { dataType: "number" })])],
        [
            "an unknown idFormat",
            root([
                text("a", [required]),
                { type: "input", dataType: "string", id: "national-id", name: "Id", configs: { key: "id", idFormat: "xx-yy" } },
            ]),
        ],
        ["a backreference", root([text("a", [required, { validator: "pattern", value: "^(a)\\1$" }])])],
        ["a lookbehind", root([text("a", [required, { validator: "pattern", value: "(?<=x)a" }])])],
    ];

    for (const [name, spec] of triggers) {
        test(`${name}: every entry point refuses the data`, () => {
            const result = validateFormData(spec, {});
            expect(result.valid).toBe(false);
            expect(Object.keys(result.errors)).toEqual([SCHEMA_ERROR_KEY]);
            expect(result.warnings?.[0]).toStartWith("the validation schema failed to compile, so the data was refused: ");

            const detailed = validateBrickSpecDataDetailed(spec, { a: "x" });
            expect(detailed.valid).toBe(false);
            expect(detailed.errors[SCHEMA_ERROR_KEY]).toBeString();
            expect(validateBrickSpecData(spec, { a: "x" })).toBe(false);
            expect(validationSchemaFailure(spec)).toBeString();
        });
    }

    test("the error message follows the locale", () => {
        const spec = triggers[0][1];
        expect(validateFormData(spec, {}, "fr").errors[SCHEMA_ERROR_KEY]).toContain("règles de validation");
    });

    const collection = (rows: BrickSpec[]): BrickSpec =>
        root([{ type: "collection", id: "collection", name: "Items", dataType: "array", configs: { key: "items" }, children: rows }]);
    const brokenRow = collection([text("x", [required, { validator: "pattern", value: "(" }])]);

    test("a collection whose row template does not compile refuses its rows", () => {
        const result = validateFormData(brokenRow, { items: [{}] });
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveProperty(SCHEMA_ERROR_KEY);
        expect(result.warnings?.[0]).toContain("Invalid regular expression");
    });

    test("a collection whose row template does not compile is refused even without rows", () => {
        expect(validateFormData(brokenRow, {}).valid).toBe(false);
        expect(validateFormData(brokenRow, { items: [] }).valid).toBe(false);
        expect(validateBrickSpecDataDetailed(brokenRow, {}).valid).toBe(false);
        expect(validationSchemaFailure(brokenRow)).toContain("Invalid regular expression");
    });

    test("a pattern too large to run in linear time is refused", () => {
        const spec = root([text("a", [{ validator: "pattern", value: "(a{100}){200}" }])]);
        expect(validateFormData(spec, { a: "a" }).valid).toBe(false);
    });

    test("a healthy spec still validates, with no warnings", () => {
        const spec = collection([text("x", [required, { validator: "pattern", value: "^[a-z]+$" }])]);
        expect(validationSchemaFailure(spec)).toBeUndefined();
        expect(validateFormData(spec, { items: [{ x: "abc" }] })).toEqual({ valid: true, errors: {} });
        expect(validateFormData(spec, { items: [{ x: "ABC" }] }).errors).toEqual({ "items[0].x": "Invalid format" });
    });
});

describe("pattern validations run in linear time", () => {
    // 26 characters took 555 ms on Ajv's native RegExp, doubling with each one more
    const naive = root([text("name", [{ validator: "pattern", value: "^([a-zA-Z]+\\s?)*$" }])]);

    test("a crafted value against a naive pattern answers at once", () => {
        for (const length of [26, 40, 100_000]) {
            const started = performance.now();
            const result = validateFormData(naive, { name: `${"a".repeat(length)}!` });
            expect(performance.now() - started).toBeLessThan(500);
            expect(result.errors).toEqual({ name: "Invalid format" });
        }
        expect(validateFormData(naive, { name: "Ada Lovelace" }).valid).toBe(true);
    });

    test("nested quantifiers on a long value stay fast", () => {
        const spec = root([text("v", [{ validator: "pattern", value: "^(a+)+$" }])]);
        const started = performance.now();
        expect(validateFormData(spec, { v: `${"a".repeat(50_000)}!` }).valid).toBe(false);
        expect(performance.now() - started).toBeLessThan(500);
    });

    test("lookahead, named groups and unicode classes keep JavaScript's meaning", () => {
        const password = root([text("p", [{ validator: "pattern", value: "^(?=.*\\d)(?=.*[a-z]).{8,}$" }])]);
        expect(validateFormData(password, { p: "abcdefg1" }).valid).toBe(true);
        expect(validateFormData(password, { p: "abcdefgh" }).valid).toBe(false);

        const code = root([text("c", [{ validator: "pattern", value: "^(?<area>[A-Z]{2})-\\d+$" }])]);
        expect(validateFormData(code, { c: "AB-12" }).valid).toBe(true);
        expect(validateFormData(code, { c: "ab-12" }).valid).toBe(false);

        const letters = root([text("l", [{ validator: "pattern", value: "^\\p{L}+$" }])]);
        expect(validateFormData(letters, { l: "Éléonore" }).valid).toBe(true);
        expect(validateFormData(letters, { l: "R2D2" }).valid).toBe(false);
    });
});

describe("linearRegExp", () => {
    const cases: [string, string[]][] = [
        ["^[a-z]+$", ["", "abc", "ABC", "a b"]],
        ["^\\d{4}(\\.\\d{2}){0,3}$", ["1234", "1234.56", "1234.56.78.90", "1234.56.78.90.12", "1234.5"]],
        ["^(a|ab)(c|bcd)(d*)$", ["abcd", "abcbcdd", "ac", "abd"]],
        ["\\bfoo\\b", ["foo bar", "afoo", "foo"]],
        ["^(?!abc).*$", ["abc", "abd", ""]],
        ["^.$", ["\n", "😀", "a", " "]],
        ["^\\uD83D\\uDE00$", ["😀", "\uD83D"]],
        ["^(a*)*$", ["", "aaa", "aab"]],
        ["^[\\]\\[]+$", ["[]", "a"]],
        ["^\\s+$", [" \t", " ﻿", "a"]],
        ["^\\w\\W\\d\\D\\S$", ["a!3x?", "a!3x "]],
        ["[^]", ["", "\n"]],
        ["", ["", "x"]],
    ];

    test("agrees with RegExp", () => {
        for (const [pattern, inputs] of cases) {
            const native = new RegExp(pattern, "u");
            const linear = linearRegExp(pattern);
            for (const input of inputs) expect([pattern, input, linear.test(input)]).toEqual([pattern, input, native.test(input)]);
        }
    });

    test("refuses what RegExp refuses, and what has no linear form", () => {
        for (const pattern of ["([a-z", "a{2,1}", "(?<=a)b", "(a)\\1", "(?<n>a)\\k<n>"]) {
            expect(() => linearRegExp(pattern)).toThrow(SyntaxError);
        }
        expect(() => linearRegExp(`(?:a{${MAX_PATTERN_PROGRAM}})`)).toThrow("pattern too large");
    });
});

describe("sandboxed match and search", () => {
    test("take a regex literal", () => {
        expect(runSandboxed("return value.match(/b+/)[0]", { value: "abbc" })).toBe("bb");
        expect(runSandboxed("return value.search(/c/)", { value: "abbc" })).toBe(3);
    });

    test("refuse a string, which would build a regex from data", () => {
        const pattern = "^(a+)+$";
        const input = `${"a".repeat(30)}!`;
        expect(() => runSandboxed("return input.match(pat) !== null", { input, pat: pattern })).toThrow("regular expression literal");
        expect(() => runSandboxed("return input.search(pat)", { input, pat: pattern })).toThrow("regular expression literal");
    });
});
