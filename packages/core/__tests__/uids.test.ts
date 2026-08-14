import { describe, expect, test } from "bun:test";
import {
    ensureBrickUids,
    stripBrickUids,
    stripUidsFromPatches,
} from "../lib/ops/uids";
import { addBrick, updateBrickConfigs } from "../lib/ops/ops";
import { pointerOfUid } from "../lib/ops/pointer";
import type { BrickSpec } from "../lib/utils/brick-spec";

const bare = (): BrickSpec =>
    ({
        type: "panel",
        id: "column",
        name: "Form",
        configs: { key: "form" },
        children: [
            {
                type: "input",
                dataType: "string",
                id: "text",
                name: "Text",
                configs: { key: "fullName", label: "Name" },
            },
            {
                type: "panel",
                id: "group",
                name: "Group",
                children: [
                    {
                        type: "input",
                        dataType: "string",
                        id: "email",
                        name: "Email",
                        configs: { key: "email" },
                    },
                ],
            },
        ],
    }) as unknown as BrickSpec;

describe("ensureBrickUids", () => {
    test("gives every brick a uid, configs-less ones included", () => {
        const hydrated = ensureBrickUids(bare());
        const uids: string[] = [];
        const walk = (brick: BrickSpec) => {
            uids.push(brick.configs?.uid as string);
            brick.children?.forEach(walk);
        };
        walk(hydrated);

        expect(uids).toHaveLength(4);
        expect(uids.every((uid) => typeof uid === "string" && uid.length > 0)).toBe(true);
        expect(new Set(uids).size).toBe(4);
    });

    test("keeps existing uids and leaves the input untouched", () => {
        const source = bare();
        source.configs!.uid = "root-kept";
        const hydrated = ensureBrickUids(source);

        expect(hydrated.configs?.uid).toBe("root-kept");
        expect(source.children![0].configs?.uid).toBeUndefined();
    });

    test("hydrated bricks are addressable by the uid-keyed ops", () => {
        const hydrated = ensureBrickUids(bare());
        const uid = hydrated.children![0].configs!.uid as string;

        expect(pointerOfUid(hydrated, uid)).toBe("/children/0");
        const updated = updateBrickConfigs(hydrated, uid, { label: "Full name" });
        expect(updated.spec.children![0].configs?.label).toBe("Full name");
    });
});

describe("stripBrickUids", () => {
    test("round-trips: hydrate then strip returns the original shape", () => {
        const source = bare();
        expect(stripBrickUids(ensureBrickUids(source))).toEqual(source);
    });

    test("drops configs entirely when uid was its only entry", () => {
        const spec = {
            type: "panel",
            id: "column",
            name: "Form",
            configs: { uid: "only" },
        } as unknown as BrickSpec;

        expect(stripBrickUids(spec).configs).toBeUndefined();
    });
});

describe("stripUidsFromPatches", () => {
    test("clears uids from added bricks and replaced configs", () => {
        const hydrated = ensureBrickUids(bare());
        const uid = hydrated.children![0].configs!.uid as string;

        const added = addBrick(
            hydrated,
            {
                type: "input",
                dataType: "string",
                id: "text",
                name: "Text",
                configs: { uid: "new-one", key: "extra" },
            } as unknown as BrickSpec,
            "0"
        );
        const configsChange = updateBrickConfigs(hydrated, uid, { label: "X" });

        const cleaned = stripUidsFromPatches([
            ...added.patches,
            ...configsChange.patches,
        ]);

        expect(JSON.stringify(cleaned)).not.toContain("new-one");
        expect(JSON.stringify(cleaned)).not.toContain(uid);
    });

    test("leaves a uid that belongs to the user's own data alone", () => {
        const patches = stripUidsFromPatches([
            {
                op: "replace",
                path: "/children/0/configs/options",
                value: [{ uid: "row-42", label: "A", value: "a" }],
            },
        ]);

        expect(patches[0]).toEqual({
            op: "replace",
            path: "/children/0/configs/options",
            value: [{ uid: "row-42", label: "A", value: "a" }],
        });
    });
});
