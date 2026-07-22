import { describe, expect, test } from "bun:test";
import { convertFormioForm } from "../lib/compat/formio";
import { iterateBricks } from "../lib/utils/brick-spec";
import { validateFormData } from "../lib/validators/validator";
import type { BrickSpec } from "../lib/utils/brick-spec";

const brickById = (spec: BrickSpec, key: string): BrickSpec => {
    for (const { brick } of iterateBricks(spec)) {
        if (brick.configs?.key === key) return brick;
    }
    throw new Error(`no brick with key ${key}`);
};

describe("convertFormioForm", () => {
    test("maps basic inputs with validations", () => {
        const { spec, warnings } = convertFormioForm({
            display: "form",
            name: "contact",
            components: [
                {
                    type: "textfield",
                    key: "name",
                    label: "Full name",
                    placeholder: "Ada",
                    validate: { required: true, minLength: 2 },
                },
                {
                    type: "email",
                    key: "email",
                    label: "Email",
                    validate: { required: true, customMessage: "Mail requis" },
                },
                {
                    type: "number",
                    key: "age",
                    label: "Age",
                    suffix: "years",
                    validate: { min: 18, max: 99 },
                },
                { type: "checkbox", key: "consent", label: "I agree" },
            ],
        });

        expect(warnings).toEqual([]);
        expect(spec.configs?.key).toBe("contact");

        const name = brickById(spec, "name");
        expect(name.id).toBe("text");
        expect(name.configs?.placeholder).toBe("Ada");
        expect(name.validations).toEqual([
            { validator: "required" },
            { validator: "minLength", value: 2 },
        ]);

        const email = brickById(spec, "email");
        expect(email.id).toBe("email");
        expect(email.validations).toEqual([
            { validator: "required", message: "Mail requis" },
            { validator: "email", message: "Mail requis" },
        ]);

        const age = brickById(spec, "age");
        expect(age.id).toBe("number");
        expect(age.dataType).toBe("number");
        expect(age.configs?.suffix).toBe("years");

        expect(brickById(spec, "consent").dataType).toBe("boolean");
    });

    test("converted spec validates data like the source form", () => {
        const { spec } = convertFormioForm({
            components: [
                {
                    type: "email",
                    key: "email",
                    label: "Email",
                    validate: { required: true },
                },
            ],
        });

        const bad = validateFormData(spec, { email: "not-an-email" }, "en");
        expect(bad.valid).toBe(false);
        expect(Object.keys(bad.errors)).toEqual(["email"]);

        const good = validateFormData(spec, { email: "ada@lovelace.dev" }, "en");
        expect(good.valid).toBe(true);
    });

    test("selects: static values, multiple, and remote url", () => {
        const { spec } = convertFormioForm({
            components: [
                {
                    type: "select",
                    key: "role",
                    label: "Role",
                    data: {
                        values: [
                            { label: "Developer", value: "dev" },
                            { label: "Designer", value: "design" },
                        ],
                    },
                },
                {
                    type: "select",
                    key: "skills",
                    label: "Skills",
                    multiple: true,
                    data: { values: [{ label: "TS", value: "ts" }] },
                },
                {
                    type: "select",
                    key: "author",
                    label: "Author",
                    dataSrc: "url",
                    data: { url: "https://api.test/users" },
                    valueProperty: "id",
                    template: "<span>{{ item.name }}</span>",
                    searchField: "q",
                },
            ],
        });

        const role = brickById(spec, "role");
        expect(role.id).toBe("select");
        expect(role.configs?.options).toEqual([
            { label: "Developer", value: "dev" },
            { label: "Designer", value: "design" },
        ]);

        const skills = brickById(spec, "skills");
        expect(skills.id).toBe("multi-select");
        expect(skills.dataType).toBe("array");

        const author = brickById(spec, "author");
        expect(author.configs?.optionsSource).toBe("remote");
        expect(author.configs?.optionsUrl).toBe("https://api.test/users");
        expect(author.configs?.valueKey).toBe("id");
        expect(author.configs?.labelKey).toBe("name");
        expect(author.configs?.searchParam).toBe("q");
    });

    test("layout: panels, columns, tabs, datagrid", () => {
        const { spec, warnings } = convertFormioForm({
            components: [
                {
                    type: "panel",
                    key: "identity",
                    title: "Identity",
                    components: [{ type: "textfield", key: "name" }],
                },
                {
                    type: "columns",
                    key: "cols",
                    columns: [
                        { components: [{ type: "textfield", key: "left" }] },
                        { components: [{ type: "textfield", key: "right" }] },
                    ],
                },
                {
                    type: "tabs",
                    key: "sections",
                    components: [
                        {
                            label: "Tab A",
                            key: "tabA",
                            components: [{ type: "textfield", key: "a" }],
                        },
                    ],
                },
                {
                    type: "datagrid",
                    key: "contacts",
                    label: "Contacts",
                    components: [
                        {
                            type: "email",
                            key: "email",
                            validate: { required: true },
                        },
                    ],
                },
                { type: "button", key: "submit", label: "Submit" },
            ],
        });

        expect(brickById(spec, "identity").id).toBe("group");
        expect(brickById(spec, "cols").id).toBe("row");
        expect(brickById(spec, "cols").children).toHaveLength(2);
        expect(brickById(spec, "sections").id).toBe("tabs");
        expect(brickById(spec, "tabA").id).toBe("group");

        const grid = brickById(spec, "contacts");
        expect(grid.type).toBe("collection");
        expect(grid.id).toBe("data-grid");
        expect(grid.children?.[0]?.configs?.key).toBe("email");

        expect(warnings.some((w) => w.includes("button"))).toBe(true);

        const rows = validateFormData(
            spec,
            { name: "x", left: "", right: "", a: "", contacts: [{ email: "bad" }] },
            "en"
        );
        expect(rows.valid).toBe(false);
        expect(Object.keys(rows.errors)).toEqual(["contacts[0].email"]);
    });

    test("wizard display becomes a stepper", () => {
        const { spec } = convertFormioForm({
            display: "wizard",
            components: [
                {
                    type: "panel",
                    key: "step1",
                    title: "Step 1",
                    components: [{ type: "textfield", key: "name" }],
                },
                {
                    type: "panel",
                    key: "step2",
                    title: "Step 2",
                    components: [{ type: "textfield", key: "city" }],
                },
            ],
        });

        const stepper = spec.children?.[0];
        expect(stepper?.id).toBe("stepper");
        expect(stepper?.children).toHaveLength(2);
        expect(stepper?.children?.[0]?.id).toBe("group");
    });

    test("conditionals become hidden rules", () => {
        const { spec, warnings } = convertFormioForm({
            components: [
                { type: "textfield", key: "channel" },
                {
                    type: "textfield",
                    key: "other",
                    conditional: { show: true, when: "channel", eq: "Other" },
                },
                {
                    type: "textfield",
                    key: "legacy",
                    customConditional: "show = data.x > 3",
                },
            ],
        });

        const other = brickById(spec, "other");
        expect(other.rules?.[0]?.type).toBe("jsonLogic");
        expect(other.rules?.[0]?.logic).toEqual({
            "!=": [{ var: "channel" }, "Other"],
        });
        expect(other.rules?.[0]?.effects?.[0]?.property?.target).toBe("hidden");

        expect(warnings.some((w) => w.includes("customConditional"))).toBe(true);
    });

    test("unknown component types warn and are skipped", () => {
        const { spec, warnings } = convertFormioForm({
            components: [
                { type: "survey", key: "sv" },
                { type: "textfield", key: "ok" },
            ],
        });

        expect(spec.children).toHaveLength(1);
        expect(warnings.some((w) => w.includes('"survey"'))).toBe(true);
    });
});
