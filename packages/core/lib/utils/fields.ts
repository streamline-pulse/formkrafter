import { resolveLocalizedText } from "./localized-text.js";
import { normalizeOptions } from "./options.js";
import type { SelectOption } from "./options.js";
import type { BrickSpec } from "./brick-spec.js";
import type { JSONSchemaType } from "../validators/json-schema-type.js";

/** One data-bearing brick of a spec, described independently of any renderer. */
export interface FieldDescriptor {
    /** Data key (`configs.key`). */
    key: string;
    /** Spec path, as `iterateBricks` yields it (`"0.2.1"`). */
    path: string;
    /** Label resolved for the locale, falling back to the key. */
    label: string;
    /** Brick id (`text`, `select`, `data-grid`, ...). */
    brick: string;
    type: "input" | "collection";
    dataType?: JSONSchemaType;
    /** Several values among `options` (multi select, select boxes, tags). */
    multiple: boolean;
    required: boolean;
    /** Static options only; remote, catalog and computed sources are not resolved here. */
    options?: SelectOption[];
    /** For a collection, the fields of one row. */
    columns?: FieldDescriptor[];
}

export interface CollectFieldsOptions {
    /** Keep keys starting with `_` (never part of the submitted data). Default false. */
    includePrivate?: boolean;
}

const staticOptions = (brick: BrickSpec): SelectOption[] | undefined => {
    const configs = brick.configs ?? {};
    const source = typeof configs.optionsSource === "string" ? configs.optionsSource : "static";
    if (source !== "static" || configs.options == null) return undefined;
    const labelKey = typeof configs.labelKey === "string" ? configs.labelKey : "label";
    const valueKey = typeof configs.valueKey === "string" ? configs.valueKey : "value";
    const options = normalizeOptions(configs.options, labelKey, valueKey);
    return options.length ? options : undefined;
};

const describe = (brick: BrickSpec, path: string, locale?: string): FieldDescriptor => {
    const key = brick.configs?.key as string;
    const label = resolveLocalizedText(brick.configs?.label, locale);
    return {
        key,
        path,
        label: typeof label === "string" && label ? label : key,
        brick: brick.id,
        type: brick.type as "input" | "collection",
        dataType: brick.dataType,
        multiple: brick.type === "input" && brick.dataType === "array",
        required: (brick.validations ?? []).some((validation) => validation.validator === "required"),
        options: staticOptions(brick),
    };
};

/**
 * Lists the fields a form collects: every input and collection with a key,
 * in document order, with the label, static options and requiredness a
 * backend or an assistant needs to read or fill the data. Panels are
 * flattened; a collection is one field whose `columns` describe a row.
 */
export const collectFields = (
    spec: BrickSpec | undefined,
    locale?: string,
    options: CollectFieldsOptions = {}
): FieldDescriptor[] => {
    const out: FieldDescriptor[] = [];
    const walk = (brick: BrickSpec | undefined, path: string, into: FieldDescriptor[]) => {
        if (!brick) return;
        const key = brick.configs?.key;
        const named = typeof key === "string" && key !== "" && (options.includePrivate || !key.startsWith("_"));

        if (brick.type === "collection") {
            if (named) {
                const field = describe(brick, path, locale);
                field.columns = [];
                for (const [index, child] of (brick.children ?? []).entries())
                    walk(child, `${path}.${index}`, field.columns);
                into.push(field);
            }
            return;
        }
        if (brick.type === "input") {
            if (named && brick.dataType && brick.dataType !== "void") into.push(describe(brick, path, locale));
            return;
        }
        if (brick.type === "panel") {
            for (const [index, child] of (brick.children ?? []).entries()) walk(child, `${path}.${index}`, into);
        }
    };
    walk(spec, "0", out);
    return out;
};
