import type { BrickSpec } from "../utils/brick-spec";
import type { Validation } from "../validators/validation";
import type { Rule } from "../rules/rule";

export interface FormioComponent {
    type?: string;
    key?: string;
    label?: string;
    title?: string;
    placeholder?: string;
    description?: string;
    tooltip?: string;
    defaultValue?: unknown;
    disabled?: boolean;
    hidden?: boolean;
    multiple?: boolean;
    prefix?: string;
    suffix?: string;
    inputMask?: string;
    html?: string;
    content?: string;
    legend?: string;
    input?: boolean;
    tableView?: boolean;
    components?: FormioComponent[];
    columns?: Array<{ components?: FormioComponent[]; width?: number }>;
    values?: Array<{ label?: string; value?: string }>;
    data?: {
        values?: Array<{ label?: string; value?: string }>;
        json?: Array<Record<string, unknown>>;
        url?: string;
    };
    dataSrc?: string;
    valueProperty?: string;
    template?: string;
    searchField?: string;
    storage?: string;
    url?: string;
    filePattern?: string;
    logic?: Array<{
        name?: string;
        trigger?: { type?: string; javascript?: string; simple?: unknown };
        actions?: Array<{
            name?: string;
            type?: string;
            state?: boolean;
            property?: { value?: string; type?: string };
        }>;
    }>;
    validate?: {
        required?: boolean;
        minLength?: number;
        maxLength?: number;
        min?: number;
        max?: number;
        step?: number | string;
        pattern?: string;
        custom?: string;
        customMessage?: string;
    };
    conditional?: {
        show?: boolean | string;
        when?: string | null;
        eq?: unknown;
    };
    customConditional?: string;
    enableTime?: boolean;
    enableDate?: boolean;
    [extra: string]: unknown;
}

export interface FormioForm {
    display?: string;
    title?: string;
    name?: string;
    components?: FormioComponent[];
    [extra: string]: unknown;
}

export interface FormioConversionResult {
    spec: BrickSpec;
    warnings: string[];
}

type Converter = {
    nextUid: () => string;
    warn: (message: string) => void;
    uploadUrls: Map<string, number>;
};

const INPUT_TYPE_MAP: Record<
    string,
    { id: string; dataType: BrickSpec["dataType"]; name: string }
> = {
    textfield: { id: "text", dataType: "string", name: "Text" },
    textarea: { id: "textarea", dataType: "string", name: "Text area" },
    number: { id: "number", dataType: "number", name: "Number" },
    currency: { id: "number", dataType: "number", name: "Currency" },
    password: { id: "password", dataType: "string", name: "Password" },
    email: { id: "email", dataType: "string", name: "Email" },
    url: { id: "url", dataType: "string", name: "URL" },
    phoneNumber: { id: "phone", dataType: "string", name: "Phone" },
    day: { id: "date", dataType: "string", name: "Date" },
    time: { id: "time", dataType: "string", name: "Time" },
    checkbox: { id: "checkbox", dataType: "boolean", name: "Checkbox" },
    hidden: { id: "hidden", dataType: "string", name: "Hidden" },
    tags: { id: "tags", dataType: "array", name: "Tags" },
    radio: { id: "radio", dataType: "string", name: "Radio" },
    signature: { id: "signature", dataType: "string", name: "Signature" },
    address: { id: "address", dataType: "string", name: "Address" },
};

export function convertFormioForm(form: FormioForm): FormioConversionResult {
    const warnings: string[] = [];
    let counter = 0;
    const ctx: Converter = {
        nextUid: () => `fio-${++counter}`,
        warn: (message) => warnings.push(message),
        uploadUrls: new Map(),
    };

    let children = convertComponents(form.components ?? [], ctx);

    if (form.display === "wizard") {
        children = [
            {
                type: "panel",
                id: "stepper",
                name: "Wizard",
                configs: {
                    uid: ctx.nextUid(),
                    key: "steps",
                    validateSteps: true,
                    allowStepClick: true,
                    showSubmit: true,
                },
                children,
            },
        ];
    }

    const spec: BrickSpec = {
        type: "panel",
        id: "column",
        name: form.title ?? "Form",
        configs: { uid: ctx.nextUid(), key: form.name ?? "form" },
        children,
    };

    for (const [url, count] of ctx.uploadUrls) {
        warnings.push(
            `${count} file component(s) store uploads at "${url}" (kept as the uploadUrl config) — configure services.fileUploadService with UrlFileUploadService to upload there`
        );
    }

    return { spec, warnings };
}

function convertComponents(
    components: FormioComponent[],
    ctx: Converter
): BrickSpec[] {
    const bricks: BrickSpec[] = [];
    for (const component of components) {
        bricks.push(...convertComponent(component, ctx));
    }
    return bricks;
}

function convertComponent(
    component: FormioComponent,
    ctx: Converter
): BrickSpec[] {
    const type = component.type ?? "textfield";

    if (type === "button") {
        ctx.warn(
            `button "${component.key ?? component.label ?? "?"}" skipped — FormKrafter renders its own submit action`
        );
        return [];
    }

    if (type === "content" || type === "htmlelement") {
        return [
            withCommon(component, ctx, {
                type: "output",
                dataType: "void",
                id: "content",
                name: "Content",
                configs: {
                    uid: ctx.nextUid(),
                    key: component.key ?? ctx.nextUid(),
                    content: String(component.html ?? component.content ?? ""),
                },
            }),
        ];
    }

    if (type === "panel" || type === "fieldset" || type === "well") {
        return [
            withCommon(component, ctx, {
                type: "panel",
                id: "group",
                name: component.title ?? component.legend ?? "Group",
                configs: {
                    uid: ctx.nextUid(),
                    key: component.key ?? ctx.nextUid(),
                    label: component.title ?? component.legend ?? component.label,
                },
                children: convertComponents(component.components ?? [], ctx),
            }),
        ];
    }

    if (type === "container") {
        ctx.warn(
            `container "${component.key ?? "?"}" flattened — FormKrafter stores data flat outside collections`
        );
        return [
            {
                type: "panel",
                id: "group",
                name: "Group",
                configs: {
                    uid: ctx.nextUid(),
                    key: component.key ?? ctx.nextUid(),
                    label: component.label,
                },
                children: convertComponents(component.components ?? [], ctx),
            },
        ];
    }

    if (type === "columns") {
        return [
            {
                type: "panel",
                id: "row",
                name: "Row",
                configs: { uid: ctx.nextUid(), key: component.key ?? ctx.nextUid() },
                children: (component.columns ?? []).map((column) => ({
                    type: "panel" as const,
                    id: "column",
                    name: "Column",
                    configs: { uid: ctx.nextUid(), key: ctx.nextUid() },
                    children: convertComponents(column.components ?? [], ctx),
                })),
            },
        ];
    }

    if (type === "tabs") {
        return [
            {
                type: "panel",
                id: "tabs",
                name: "Tabs",
                configs: {
                    uid: ctx.nextUid(),
                    key: component.key ?? ctx.nextUid(),
                    validateTabs: false,
                },
                children: (component.components ?? []).map((tab) => ({
                    type: "panel" as const,
                    id: "group",
                    name: tab.label ?? "Tab",
                    configs: {
                        uid: ctx.nextUid(),
                        key: tab.key ?? ctx.nextUid(),
                        label: tab.label,
                    },
                    children: convertComponents(tab.components ?? [], ctx),
                })),
            },
        ];
    }

    if (type === "datagrid" || type === "editgrid") {
        if (type === "editgrid") {
            ctx.warn(
                `editgrid "${component.key ?? "?"}" converted to a data-grid — row templates are not preserved`
            );
        }
        return [
            withCommon(component, ctx, {
                type: "collection",
                dataType: "array",
                id: "data-grid",
                name: "Data grid",
                configs: {
                    uid: ctx.nextUid(),
                    key: component.key ?? ctx.nextUid(),
                    label: component.label,
                },
                children: convertComponents(component.components ?? [], ctx),
            }),
        ];
    }

    if (type === "datetime") {
        const dateOnly = component.enableTime === false;
        return [
            withCommon(component, ctx, {
                type: "input",
                dataType: "string",
                id: dateOnly ? "date" : "datetime",
                name: dateOnly ? "Date" : "Date & time",
                configs: baseConfigs(component, ctx),
            }),
        ];
    }

    if (type === "select") {
        return [convertSelect(component, ctx)];
    }

    if (type === "selectboxes") {
        return [
            withCommon(component, ctx, {
                type: "input",
                dataType: "array",
                id: "select-boxes",
                name: "Select boxes",
                configs: {
                    ...baseConfigs(component, ctx),
                    optionsSource: "static",
                    options: staticOptions(component.values),
                },
            }),
        ];
    }

    if (type === "radio") {
        return [
            withCommon(component, ctx, {
                type: "input",
                dataType: "string",
                id: "radio",
                name: "Radio",
                configs: {
                    ...baseConfigs(component, ctx),
                    optionsSource: "static",
                    options: staticOptions(component.values),
                },
            }),
        ];
    }

    if (type === "form") {
        const ref = String(
            component.form ?? component.path ?? component.src ?? ""
        );
        ctx.warn(
            `nested form "${component.key ?? "?"}" references "${ref}" — configure services.specSourceService so it can be resolved`
        );
        return [
            withCommon(component, ctx, {
                type: "panel",
                id: "nested-form",
                name: "Nested form",
                configs: {
                    uid: ctx.nextUid(),
                    key: component.key ?? ctx.nextUid(),
                    label: component.label,
                    specRef: ref,
                },
            }),
        ];
    }

    if (type === "file") {
        const configs = baseConfigs(component, ctx);
        if (component.filePattern && component.filePattern !== "*") {
            configs.accept = component.filePattern;
        }
        configs.multiple = component.multiple === true;
        if (component.storage === "url" && component.url) {
            configs.uploadUrl = component.url;
            ctx.uploadUrls.set(
                component.url,
                (ctx.uploadUrls.get(component.url) ?? 0) + 1
            );
        }
        return [
            withCommon(component, ctx, {
                type: "input",
                dataType: component.multiple ? "array" : "object",
                id: "file",
                name: "File",
                configs,
            }),
        ];
    }

    const mapped = INPUT_TYPE_MAP[type];
    if (mapped) {
        if (type === "day") {
            ctx.warn(
                `day "${component.key ?? "?"}" approximated with a date input`
            );
        }
        if (type === "currency") {
            ctx.warn(
                `currency "${component.key ?? "?"}" converted to a number with a prefix`
            );
        }
        const configs = baseConfigs(component, ctx);
        if (type === "currency" && !configs.prefix) {
            configs.prefix = String(component.currency ?? "$");
        }
        return [
            withCommon(component, ctx, {
                type: "input",
                dataType: mapped.dataType,
                id: mapped.id,
                name: mapped.name,
                configs,
            }),
        ];
    }

    ctx.warn(
        `unsupported component type "${type}" (key "${component.key ?? "?"}") skipped`
    );
    return [];
}

function convertSelect(component: FormioComponent, ctx: Converter): BrickSpec {
    const multiple = component.multiple === true;
    const configs = baseConfigs(component, ctx);

    if (component.dataSrc === "url" && component.data?.url) {
        configs.optionsSource = "remote";
        configs.optionsUrl = component.data.url;
        if (component.valueProperty) configs.valueKey = component.valueProperty;
        const templateKey = labelKeyFromTemplate(component.template);
        if (templateKey) configs.labelKey = templateKey;
        if (component.searchField) configs.searchParam = component.searchField;
    } else if (component.dataSrc === "json" && Array.isArray(component.data?.json)) {
        configs.optionsSource = "static";
        configs.options = jsonOptions(component, ctx);
    } else {
        if (component.dataSrc && !["values", "json", ""].includes(component.dataSrc)) {
            ctx.warn(
                `select "${component.key ?? "?"}" uses dataSrc "${component.dataSrc}" — converted to static options`
            );
        }
        configs.optionsSource = "static";
        configs.options = staticOptions(component.data?.values ?? component.values);
    }

    return withCommon(component, ctx, {
        type: "input",
        dataType: multiple ? "array" : "string",
        id: multiple ? "multi-select" : "select",
        name: multiple ? "Multi select" : "Select",
        configs,
    });
}

function jsonOptions(
    component: FormioComponent,
    ctx: Converter
): Array<{ label: string; value: string }> {
    const items = component.data?.json ?? [];
    const labelKey = labelKeyFromTemplate(component.template) ?? "label";
    let valueKey = component.valueProperty;
    if (!valueKey) {
        const first = items[0] ?? {};
        valueKey = "value" in first ? "value" : labelKey;
        if (valueKey === labelKey) {
            ctx.warn(
                `select "${component.key ?? "?"}" has no valueProperty — option labels are used as values`
            );
        }
    }
    return items.map((item) => ({
        label: String(item[labelKey] ?? item[valueKey!] ?? ""),
        value: String(item[valueKey!] ?? item[labelKey] ?? ""),
    }));
}

function labelKeyFromTemplate(template?: string): string | undefined {
    if (!template) return undefined;
    const match = /item\.([a-zA-Z0-9_.]+)/.exec(template);
    return match?.[1];
}

function staticOptions(
    values?: Array<{ label?: string; value?: string }>
): Array<{ label: string; value: string }> {
    return (values ?? []).map((option) => ({
        label: String(option.label ?? option.value ?? ""),
        value: String(option.value ?? option.label ?? ""),
    }));
}

function baseConfigs(
    component: FormioComponent,
    ctx: Converter
): Record<string, unknown> & { uid: string; key: string } {
    const configs: Record<string, unknown> & { uid: string; key: string } = {
        uid: ctx.nextUid(),
        key: component.key ?? ctx.nextUid(),
    };
    if (component.label) configs.label = component.label;
    if (component.placeholder) configs.placeholder = component.placeholder;
    if (component.description) configs.description = component.description;
    if (component.defaultValue !== undefined && component.defaultValue !== "") {
        configs.defaultValue = component.defaultValue;
    }
    if (component.validate?.step != null && component.validate.step !== "") {
        configs.step = component.validate.step;
    }
    if (component.disabled) configs.disabled = true;
    if (component.prefix) configs.prefix = component.prefix;
    if (component.suffix) configs.suffix = component.suffix;
    if (typeof component.inputMask === "string" && component.inputMask) {
        configs.mask = component.inputMask;
    }
    return configs;
}

function withCommon(
    component: FormioComponent,
    ctx: Converter,
    brick: BrickSpec
): BrickSpec {
    const validations = convertValidations(component, ctx);
    if (validations.length) brick.validations = validations;

    const conditionalRules = convertConditional(component, ctx);
    const rules = [...conditionalRules];

    if (component.hidden && conditionalRules.length === 0) {
        rules.push({
            name: "always hidden",
            type: "jsonLogic",
            logic: true,
            effects: [
                { property: { target: "hidden", type: "boolean" }, boolean: true },
            ],
        });
    }

    rules.push(...convertLogic(component, ctx));

    if (rules.length) brick.rules = rules;

    return brick;
}

function convertLogic(component: FormioComponent, ctx: Converter): Rule[] {
    const rules: Rule[] = [];

    for (const logic of component.logic ?? []) {
        const trigger = logic.trigger;
        if (trigger?.type !== "javascript" || !trigger.javascript) {
            ctx.warn(
                `logic "${logic.name ?? "?"}" on "${component.key ?? "?"}" skipped — only javascript triggers are converted`
            );
            continue;
        }

        const effects = [];
        for (const action of logic.actions ?? []) {
            if (action.type === "property" && action.property?.value) {
                effects.push({
                    property: {
                        target: action.property.value,
                        type: "boolean" as const,
                    },
                    boolean: action.state === true,
                });
            } else {
                ctx.warn(
                    `logic action "${action.name ?? action.type ?? "?"}" on "${component.key ?? "?"}" skipped — only property actions are converted`
                );
            }
        }
        if (!effects.length) continue;

        rules.push({
            name: logic.name ?? `formio logic (${component.key ?? "?"})`,
            type: "javaScript",
            code: [
                "const data = dataMap;",
                "const row = dataMap;",
                "let result = false;",
                trigger.javascript,
                "return result === true;",
            ].join("\n"),
            effects,
        });
    }

    return rules;
}

function convertValidations(
    component: FormioComponent,
    ctx: Converter
): Validation[] {
    const source = component.validate ?? {};
    const validations: Validation[] = [];
    const message = source.customMessage;

    const push = (validation: Validation) => {
        if (message) validation.message = message;
        validations.push(validation);
    };

    const bound = (raw: unknown): number | undefined => {
        if (raw == null || raw === "" || raw === false) return undefined;
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : undefined;
    };

    if (source.required) push({ validator: "required" });
    const minLength = bound(source.minLength);
    if (minLength !== undefined) push({ validator: "minLength", value: minLength });
    const maxLength = bound(source.maxLength);
    if (maxLength !== undefined) push({ validator: "maxLength", value: maxLength });
    const min = bound(source.min);
    if (min !== undefined) push({ validator: "min", value: min });
    const max = bound(source.max);
    if (max !== undefined) push({ validator: "max", value: max });
    if (source.pattern) push({ validator: "pattern", value: source.pattern });
    if (component.type === "email") push({ validator: "email" });
    if (component.type === "url") push({ validator: "url" });

    if (source.custom) {
        ctx.warn(
            `validate.custom on "${component.key ?? "?"}" converted automatically — review the generated custom validator`
        );
        validations.push({
            validator: "custom",
            customValidator: [
                "const input = value;",
                "const data = dataMap;",
                "const row = dataMap;",
                "let valid = true;",
                source.custom,
                "return valid;",
            ].join("\n"),
        });
    }

    return validations;
}

function convertConditional(
    component: FormioComponent,
    ctx: Converter
): Rule[] {
    if (component.customConditional) {
        ctx.warn(
            `customConditional on "${component.key ?? "?"}" skipped — rewrite it as a FormKrafter rule`
        );
    }

    const conditional = component.conditional;
    if (!conditional || !conditional.when) return [];

    const show = conditional.show === true || conditional.show === "true";
    const comparison = {
        [show ? "!=" : "=="]: [{ var: conditional.when }, conditional.eq],
    };

    return [
        {
            name: `formio conditional (${conditional.when})`,
            type: "jsonLogic",
            logic: comparison as Rule["logic"],
            effects: [
                { property: { target: "hidden", type: "boolean" }, boolean: true },
            ],
        },
    ];
}
