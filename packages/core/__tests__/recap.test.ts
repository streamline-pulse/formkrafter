import { describe, expect, test } from "bun:test";
import { collectRecapItems } from "../lib/utils/recap";
import type { BrickSpec } from "../lib/utils/brick-spec";

const spec = {
    type: "panel",
    id: "column",
    name: "Form",
    configs: { uid: "root", key: "form" },
    children: [
        {
            type: "panel",
            id: "group",
            name: "Order",
            configs: { uid: "g1", key: "order", label: "Order" },
            children: [
                {
                    type: "input",
                    dataType: "string",
                    id: "select",
                    name: "Select",
                    configs: {
                        uid: "u1",
                        key: "shipping",
                        label: "Shipping",
                        options: [
                            { label: "Standard", value: "std" },
                            { label: "Express", value: "exp" },
                        ],
                    },
                },
                {
                    type: "input",
                    dataType: "boolean",
                    id: "checkbox",
                    name: "Checkbox",
                    configs: { uid: "u2", key: "gift", label: "Gift wrap" },
                },
                {
                    type: "input",
                    dataType: "string",
                    id: "text",
                    name: "Text",
                    configs: { uid: "u3", key: "notes", label: "Notes" },
                },
                {
                    type: "input",
                    dataType: "string",
                    id: "text",
                    name: "Text",
                    configs: { uid: "u4", key: "_internal", label: "Internal" },
                },
            ],
        },
    ],
} as unknown as BrickSpec;

describe("collectRecapItems", () => {
    test("summarizes present values, resolves option labels and booleans", () => {
        const items = collectRecapItems(
            spec,
            { shipping: "exp", gift: true, _internal: "x" },
            undefined,
            false
        );

        expect(items).toEqual([
            { kind: "field", label: "Shipping", value: "Express" },
            { kind: "field", label: "Gift wrap", value: "Yes" },
        ]);
    });

    test("showEmpty surfaces untouched fields as dashes", () => {
        const items = collectRecapItems(spec, {}, undefined, true);
        const notes = items.find(
            (item) => item.kind === "field" && item.label === "Notes"
        );
        expect(notes).toEqual({ kind: "field", label: "Notes", value: "—" });
    });

    test("groupBySections emits a section header per labeled panel", () => {
        const items = collectRecapItems(
            spec,
            { shipping: "std" },
            undefined,
            false,
            true
        );
        expect(items[0]).toEqual({ kind: "section", label: "Order" });
    });
});
