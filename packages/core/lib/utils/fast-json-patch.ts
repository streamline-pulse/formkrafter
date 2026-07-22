import * as fastJsonPatchModule from "fast-json-patch";

type FastJsonPatchApi = {
    applyPatch: typeof fastJsonPatchModule.applyPatch;
};

const fastJsonPatch: FastJsonPatchApi =
    (fastJsonPatchModule as unknown as { default?: FastJsonPatchApi }).default ??
    fastJsonPatchModule;

export const applyPatch = fastJsonPatch.applyPatch;
export type { Operation } from "fast-json-patch";
