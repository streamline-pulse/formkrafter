import { describe, expect, test } from "bun:test";
import { collectFields } from "../lib/utils/fields";
import type { BrickSpec } from "../lib/utils/brick-spec";

const input = (
    id: string,
    dataType: string,
    configs: Record<string, unknown>,
    extra: Record<string, unknown> = {}
) => ({ type: "input", id, name: id, dataType, configs, ...extra });

const spec = {
    type: "panel",
    id: "column",
    name: "Form",
    configs: { key: "form" },
    children: [
        {
            type: "panel",
            id: "group",
            name: "Group",
            configs: { key: "identity", label: { en: "Identity", fr: "Identité" } },
            children: [
                input("text", "string", { key: "name", label: { en: "Name", fr: "Nom" } }, {
                    validations: [{ validator: "required" }],
                }),
                input("number", "number", { key: "amount", label: "Amount" }),
                input("date", "string", { key: "birth" }),
                input("select", "string", { key: "shipping", label: "Shipping", options: "Standard\nExpress" }),
                input("multi-select", "array", {
                    key: "docs",
                    label: "Documents",
                    options: [
                        { label: "ID card", value: "id" },
                        { label: "Passport", value: "passport" },
                    ],
                }),
                input("select", "string", { key: "country", optionsSource: "remote", optionsUrl: "https://x" }),
                input("hidden", "string", { key: "_token" }),
                { type: "output", id: "content", name: "Content", dataType: "void", configs: { key: "intro" } },
            ],
        },
        {
            type: "collection",
            id: "data-grid",
            name: "Data grid",
            dataType: "array",
            configs: { key: "contacts", label: "Contacts" },
            children: [
                input("text", "string", { key: "contact", label: "Contact" }),
                input("checkbox", "boolean", { key: "primary", label: "Primary" }),
            ],
        },
    ],
} as unknown as BrickSpec;

describe("collectFields", () => {
    const fields = collectFields(spec, "fr");
    const byKey = Object.fromEntries(fields.map((field) => [field.key, field]));

    test("lists inputs and collections in document order, panels flattened", () => {
        expect(fields.map((field) => field.key)).toEqual([
            "name",
            "amount",
            "birth",
            "shipping",
            "docs",
            "country",
            "contacts",
        ]);
    });

    test("resolves labels for the locale and falls back to the key", () => {
        expect(byKey.name.label).toBe("Nom");
        expect(byKey.birth.label).toBe("birth");
        expect(collectFields(spec, "en")[0].label).toBe("Name");
    });

    test("carries brick, type, requiredness and spec path", () => {
        expect(byKey.name).toMatchObject({ brick: "text", type: "input", dataType: "string", required: true, path: "0.0.0" });
        expect(byKey.amount.required).toBe(false);
    });

    test("parses static options and flags multiple values", () => {
        expect(byKey.shipping.options).toEqual([
            { label: "Standard", value: "Standard" },
            { label: "Express", value: "Express" },
        ]);
        expect(byKey.docs.multiple).toBe(true);
        expect(byKey.docs.options?.map((option) => option.value)).toEqual(["id", "passport"]);
        expect(byKey.country.options).toBeUndefined();
    });

    test("describes a collection with its row columns", () => {
        expect(byKey.contacts.type).toBe("collection");
        expect(byKey.contacts.columns?.map((column) => column.key)).toEqual(["contact", "primary"]);
        expect(byKey.contacts.columns?.[1].dataType).toBe("boolean");
    });

    test("skips private keys unless asked, and outputs", () => {
        expect(byKey._token).toBeUndefined();
        expect(byKey.intro).toBeUndefined();
        expect(collectFields(spec, "fr", { includePrivate: true }).some((field) => field.key === "_token")).toBe(true);
    });

    test("returns nothing for an empty spec", () => {
        expect(collectFields(undefined)).toEqual([]);
    });
});
