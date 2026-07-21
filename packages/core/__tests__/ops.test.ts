import { describe, expect, test } from "bun:test";
import { iterateBricks, type BrickSpec } from "../lib/utils/brick-spec";
import {
  getBrickAt,
  pointerFromPath,
  pointerOfUid,
} from "../lib/ops/pointer";
import {
  addBrick,
  duplicateBrick,
  moveBrick,
  removeBrick,
  updateBrickConfigs,
  updateBrickRules,
} from "../lib/ops/ops";
import { SpecHistory } from "../lib/ops/history";

const input = (id: string, uid: string): BrickSpec => ({
  type: "input",
  dataType: "string",
  id,
  name: id,
  configs: { uid, key: id },
});

const form = (): BrickSpec => ({
  type: "panel",
  id: "root",
  name: "root",
  configs: { uid: "u-root", key: "root" },
  children: [
    input("firstname", "u-1"),
    input("lastname", "u-2"),
    {
      type: "panel",
      id: "address",
      name: "address",
      configs: { uid: "u-3", key: "address" },
      children: [input("city", "u-4")],
    },
  ],
});

describe("iterateBricks", () => {
  test("walks the tree depth-first with paths, without copying nodes", () => {
    const spec = form();
    const entries = [...iterateBricks(spec)];

    expect(entries.map((entry) => [entry.brick.id, entry.path])).toEqual([
      ["root", "0"],
      ["firstname", "0.0"],
      ["lastname", "0.1"],
      ["address", "0.2"],
      ["city", "0.2.0"],
    ]);
    expect(entries[3].brick).toBe(spec.children![2]);
  });

  test("yields nothing for an undefined spec", () => {
    expect([...iterateBricks(undefined)]).toEqual([]);
  });
});

describe("pointer", () => {
  test("pointerFromPath converts dot paths to JSON pointers", () => {
    expect(pointerFromPath("0")).toBe("");
    expect(pointerFromPath("0.1")).toBe("/children/1");
    expect(pointerFromPath("0.2.0")).toBe("/children/2/children/0");
  });

  test("pointerOfUid finds nested bricks", () => {
    expect(pointerOfUid(form(), "u-root")).toBe("");
    expect(pointerOfUid(form(), "u-4")).toBe("/children/2/children/0");
    expect(pointerOfUid(form(), "missing")).toBeUndefined();
  });

  test("getBrickAt resolves dot paths", () => {
    expect(getBrickAt(form(), "0.2.0")?.id).toBe("city");
    expect(getBrickAt(form(), "0.9")).toBeUndefined();
  });
});

describe("ops", () => {
  test("addBrick appends by default and inserts at index", () => {
    const spec = form();
    const appended = addBrick(spec, input("email", "u-5"), "0");
    expect(appended.spec.children?.map((child) => child.id)).toEqual([
      "firstname",
      "lastname",
      "address",
      "email",
    ]);

    const inserted = addBrick(spec, input("email", "u-5"), "0", 1);
    expect(inserted.spec.children?.[1].id).toBe("email");
    expect(inserted.patches).toEqual([
      { op: "add", path: "/children/1", value: input("email", "u-5") },
    ]);
  });

  test("addBrick creates the children array when missing", () => {
    const spec = form();
    const update = addBrick(spec, input("zip", "u-5"), "0.2.0");
    expect(getBrickAt(update.spec, "0.2.0")?.children?.[0].id).toBe("zip");
  });

  test("ops never mutate the input spec", () => {
    const spec = form();
    const before = JSON.stringify(spec);
    addBrick(spec, input("email", "u-5"), "0");
    removeBrick(spec, "0.1");
    moveBrick(spec, "0.0", "0.2");
    updateBrickConfigs(spec, "u-1", { label: "First name" });
    expect(JSON.stringify(spec)).toBe(before);
  });

  test("removeBrick and its inverse roundtrip", () => {
    const spec = form();
    const update = removeBrick(spec, "0.1");
    expect(update.spec.children?.map((child) => child.id)).toEqual([
      "firstname",
      "address",
    ]);

    const history = new SpecHistory();
    history.record(update);
    const restored = history.undo(update.spec);
    expect(restored).toEqual(spec);
  });

  test("removeBrick rejects the root", () => {
    expect(() => removeBrick(form(), "0")).toThrow();
  });

  test("moveBrick reorders and its inverse restores", () => {
    const spec = form();
    const update = moveBrick(spec, "0.0", "0.2");
    expect(update.spec.children?.map((child) => child.id)).toEqual([
      "lastname",
      "address",
      "firstname",
    ]);

    const history = new SpecHistory();
    history.record(update);
    expect(history.undo(update.spec)).toEqual(spec);
  });

  test("moveBrick moves across parents", () => {
    const update = moveBrick(form(), "0.0", "0.1.0");
    expect(getBrickAt(update.spec, "0.1.0")?.id).toBe("firstname");
    expect(update.spec.children?.length).toBe(2);
  });

  test("duplicateBrick inserts a sibling with fresh uids", () => {
    const update = duplicateBrick(form(), "0.2");
    const original = getBrickAt(update.spec, "0.2");
    const copy = getBrickAt(update.spec, "0.3");

    expect(copy?.id).toBe("address");
    expect(copy?.configs?.uid).not.toBe(original?.configs?.uid);
    expect(copy?.children?.[0].configs?.uid).not.toBe(
      original?.children?.[0].configs?.uid
    );
  });

  test("updateBrickConfigs merges and patches only the configs", () => {
    const update = updateBrickConfigs(form(), "u-4", { label: "City" });
    expect(getBrickAt(update.spec, "0.2.0")?.configs).toEqual({
      uid: "u-4",
      key: "city",
      label: "City",
    });
    expect(update.patches).toHaveLength(1);
    expect(update.patches[0].path).toBe("/children/2/children/0/configs");
  });

  test("updateBrickRules adds the section when absent, inverse removes it", () => {
    const spec = form();
    const rules = [{ name: "r", type: "jsonLogic" as const, logic: true }];
    const update = updateBrickRules(spec, "u-1", rules);
    expect(getBrickAt(update.spec, "0.0")?.rules).toEqual(rules);
    expect(update.inverse).toEqual([{ op: "remove", path: "/children/0/rules" }]);
  });

  test("update by unknown uid throws", () => {
    expect(() => updateBrickConfigs(form(), "nope", {})).toThrow();
  });
});

describe("SpecHistory", () => {
  test("undo and redo walk the timeline", () => {
    const history = new SpecHistory();
    let spec = form();

    const first = addBrick(spec, input("email", "u-5"), "0");
    history.record(first);
    spec = first.spec;

    const second = removeBrick(spec, "0.0");
    history.record(second);
    spec = second.spec;

    expect(spec.children?.map((child) => child.id)).toEqual([
      "lastname",
      "address",
      "email",
    ]);

    spec = history.undo(spec)!;
    expect(spec.children?.map((child) => child.id)).toEqual([
      "firstname",
      "lastname",
      "address",
      "email",
    ]);

    spec = history.undo(spec)!;
    expect(spec).toEqual(form());
    expect(history.canUndo).toBe(false);

    spec = history.redo(spec)!;
    spec = history.redo(spec)!;
    expect(spec.children?.map((child) => child.id)).toEqual([
      "lastname",
      "address",
      "email",
    ]);
    expect(history.canRedo).toBe(false);
  });

  test("recording clears the redo branch", () => {
    const history = new SpecHistory();
    const spec = form();

    const first = addBrick(spec, input("email", "u-5"), "0");
    history.record(first);
    history.undo(first.spec);
    expect(history.canRedo).toBe(true);

    history.record(addBrick(spec, input("phone", "u-6"), "0"));
    expect(history.canRedo).toBe(false);
  });
});
