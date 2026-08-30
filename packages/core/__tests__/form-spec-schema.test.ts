import { describe, expect, test } from "bun:test";
import Ajv from "ajv/dist/2020";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import schema from "../schema/form-spec.schema.json";
import { convertFormioForm } from "../lib/compat/formio";
import type { BrickSpec } from "../lib/utils/brick-spec";

const ROOT = join(import.meta.dir, "../../..");

const compile = () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    return ajv.compile(schema);
};

const unionMembers = (file: string, name: string): string[] => {
    const source = readFileSync(join(ROOT, file), "utf8");
    const declaration = source.slice(source.indexOf(`type ${name} =`));
    const body = declaration.slice(0, declaration.indexOf(";"));
    return [...body.matchAll(/["']([a-zA-Z]+)["']/g)].map((m) => m[1]);
};

const enumOf = (path: string[]): string[] => {
    let node: Record<string, unknown> = schema as never;
    for (const key of path) node = node[key] as Record<string, unknown>;
    return node.enum as string[];
};

describe("the published schema tracks the types", () => {
    test("brickType matches the BrickType union", () => {
        expect(enumOf(["$defs", "brickType"])).toEqual(
            unionMembers("packages/core/lib/utils/brick-type.ts", "BrickType")
        );
    });

    test("validator matches the Validator union", () => {
        expect(enumOf(["$defs", "validator"])).toEqual(
            unionMembers("packages/core/lib/validators/validator.ts", "Validator")
        );
    });

    test("jsonSchemaPrimitiveType matches the JSONSchemaType union", () => {
        expect(enumOf(["$defs", "jsonSchemaPrimitiveType"])).toEqual(
            unionMembers(
                "packages/core/lib/validators/json-schema-type.ts",
                "JSONSchemaPrimitiveType"
            )
        );
    });
});

const converted = (): Array<{ file: string; spec: BrickSpec }> => {
    const dir = join(ROOT, "packages/core/__tests__/fixtures/formio");
    return readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => ({
            file: f,
            spec: convertFormioForm(
                JSON.parse(readFileSync(join(dir, f), "utf8"))
            ).spec,
        }));
};

describe("every spec the converter produces validates", () => {
    const validate = compile();
    const specs = converted();

    test("the fixtures were found", () => {
        expect(specs.length).toBeGreaterThan(0);
    });

    for (const { file, spec } of specs) {
        test(file, () => {
            if (!validate(spec)) {
                throw new Error(
                    `${file} converts to a spec the published schema rejects:\n` +
                        (validate.errors ?? [])
                            .map((e) => `  ${e.instancePath || "/"} ${e.message}`)
                            .join("\n")
                );
            }
        });
    }
});

describe("the schema rejects what the engine would reject", () => {
    const validate = compile();

    test("an unknown brick type", () => {
        expect(
            validate({ type: "widget", id: "text", name: "T" })
        ).toBe(false);
    });

    test("an unknown validator", () => {
        expect(
            validate({
                type: "input",
                id: "text",
                name: "T",
                validations: [{ validator: "requiredish" }],
            })
        ).toBe(false);
    });

    test("a stray property on the brick", () => {
        expect(
            validate({ type: "input", id: "text", name: "T", colour: "red" })
        ).toBe(false);
    });

    test("but unknown brick configs are allowed", () => {
        expect(
            validate({
                type: "input",
                id: "select",
                name: "S",
                configs: { key: "k", optionsSource: "remote", optionsUrl: "/x" },
            })
        ).toBe(true);
    });
});
