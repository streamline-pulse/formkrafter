import { applyPatch, type Operation } from "fast-json-patch";
import type { BrickSpec } from "../utils/brick-spec";
import type { SpecUpdate } from "./ops";

type HistoryEntry = {
  patches: Operation[];
  inverse: Operation[];
};

export class SpecHistory {
  private past: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];

  record(update: SpecUpdate): void {
    this.past.push({ patches: update.patches, inverse: update.inverse });
    this.future = [];
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  undo(spec: BrickSpec): BrickSpec | undefined {
    const entry = this.past.pop();
    if (!entry) return undefined;

    this.future.push(entry);

    return applyPatch(spec, entry.inverse, true, false).newDocument;
  }

  redo(spec: BrickSpec): BrickSpec | undefined {
    const entry = this.future.pop();
    if (!entry) return undefined;

    this.past.push(entry);

    return applyPatch(spec, entry.patches, true, false).newDocument;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}
