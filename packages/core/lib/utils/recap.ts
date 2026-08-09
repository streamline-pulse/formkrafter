import { fkTOr } from "../i18n";
import { getAffectedProperties } from "../brick/utils";
import { resolveLocalizedText } from "./localized-text";
import { normalizeOptions } from "./options";
import type { BrickSpec } from "./brick-spec";

export type RecapItem =
    | { kind: "field"; label: string; value: string }
    | { kind: "section"; label: string }
    | { kind: "collection"; label: string; columns: string[]; rows: string[][] };

const formatRecapValue = (brick: BrickSpec, value: unknown): string => {
    if (Array.isArray(value)) {
        return value
            .map((item) => formatRecapValue(brick, item))
            .filter(Boolean)
            .join(", ");
    }
    if (value === true) return fkTOr("recap.yes", "Yes");
    if (value === false) return fkTOr("recap.no", "No");
    if (value && typeof value === "object") {
        const record = value as Record<string, unknown>;
        if (typeof record.name === "string" && "url" in record) return record.name;
        return Object.values(record)
            .filter((part) => typeof part === "string" && part)
            .join(" ");
    }

    const raw = String(value ?? "");
    if (brick.configs?.options != null) {
        const labelKey =
            typeof brick.configs.labelKey === "string" ? brick.configs.labelKey : "label";
        const valueKey =
            typeof brick.configs.valueKey === "string" ? brick.configs.valueKey : "value";
        const match = normalizeOptions(brick.configs.options, labelKey, valueKey).find(
            (option) => option.value === raw
        );
        if (match) return match.label;
    }
    return raw;
};

const isEmptyRecapValue = (raw: unknown): boolean =>
    raw === undefined ||
    raw === null ||
    raw === "" ||
    (Array.isArray(raw) && raw.length === 0);

const brickLabel = (brick: BrickSpec, locale?: string): string =>
    String(
        resolveLocalizedText(brick.configs?.label, locale) ??
            brick.name ??
            brick.configs?.key ??
            ""
    );

const collectionInputs = (spec: BrickSpec): BrickSpec[] => {
    const inputs: BrickSpec[] = [];
    for (const child of spec.children ?? []) {
        const key = child.configs?.key;
        if (child.type === "input" && key && !key.startsWith("_")) {
            inputs.push(child);
        }
    }
    return inputs;
};

/**
 * Walks a spec and summarizes the present data as renderer-agnostic items:
 * plain fields, section headers and collection tables. Shared by the web and
 * native recap bricks.
 */
export const collectRecapItems = (
    spec: BrickSpec | undefined,
    dataMap: Record<string, unknown> | undefined,
    locale: string | undefined,
    showEmpty: boolean,
    groupBySections = false
): RecapItem[] => {
    if (!spec) return [];
    const items: RecapItem[] = [];

    for (const child of spec.children ?? []) {
        if (child.id === "recap" || child.type === "action") continue;
        if (getAffectedProperties(child.rules, dataMap).hidden === true) continue;

        const key = child.configs?.key;
        const label = brickLabel(child, locale);

        if (child.type === "collection") {
            const rows =
                key && Array.isArray(dataMap?.[key])
                    ? (dataMap[key] as Record<string, unknown>[])
                    : [];
            if (!rows.length && !showEmpty) continue;

            const inputs = collectionInputs(child);
            items.push({
                kind: "collection",
                label,
                columns: inputs.map((input) => brickLabel(input, locale)),
                rows: rows.map((row) =>
                    inputs.map((input) => {
                        const raw = row?.[input.configs!.key!];
                        return isEmptyRecapValue(raw) ? "—" : formatRecapValue(input, raw);
                    })
                ),
            });
            continue;
        }

        if (child.type === "panel") {
            const sectionLabel = resolveLocalizedText(child.configs?.label, locale);
            if (
                groupBySections &&
                typeof sectionLabel === "string" &&
                sectionLabel.trim()
            ) {
                const sectionItems = collectRecapItems(child, dataMap, locale, showEmpty);
                if (sectionItems.length) {
                    items.push({ kind: "section", label: sectionLabel });
                    items.push(...sectionItems);
                }
                continue;
            }
            items.push(
                ...collectRecapItems(child, dataMap, locale, showEmpty, groupBySections)
            );
            continue;
        }

        if (child.type !== "input" || !key || key.startsWith("_")) continue;

        const raw = dataMap?.[key];
        if (isEmptyRecapValue(raw) && !showEmpty) continue;

        items.push({
            kind: "field",
            label,
            value: isEmptyRecapValue(raw) ? "—" : formatRecapValue(child, raw),
        });
    }

    return items;
};
