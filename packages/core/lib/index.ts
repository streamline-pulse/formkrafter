// Brick requirements utils
export { BrickType } from "./utils/brick-type.js";
export { BrickMold } from "./utils/brick-mold.js";
export { DropType, BrickMoldDropType, BrickSpecDropType } from "./utils/drop-type.js";

// Brick configs utils
export { BrickStyles } from "./utils/brick-styles.js";
export { BrickBaseConfigs, CommonBrickProps, WithBrickBaseConfigs } from "./utils/common-brick-props.js";
export {
    BrickSpec,
    buildValidationSchema,
    iterateBricks,
    iterateSchemaBricks,
    defaultFormData,
} from "./utils/brick-spec.js";

// Per-brick data plumbing, shared by every renderer
export { getBrickData, wrapBrickData } from "./utils/brick-data.js";

// Select option parsing, shared by every renderer
export { SelectOption, normalizeOptions } from "./utils/options.js";

// Recap summarization, shared by every renderer
export { RecapItem, collectRecapItems } from "./utils/recap.js";

// Field introspection, for backends and assistants that read or fill a form
export { FieldDescriptor, CollectFieldsOptions, collectFields } from "./utils/fields.js";
export { IdentityFormat, IDENTITY_FORMATS, checkIdentity, checkFrNir, checkBjNpi, checkDigits, checkLuhn, checkFrSiren, checkFrSiret, checkBjIfu, checkIban, formatIban } from "./utils/identity.js";
export { MrzResult, parseMrz, mrzLines, mrzCheckDigit } from "./utils/mrz.js";
export { Slot, SlotRules, generateSlots, readSlots, groupSlotsByDay, slotDate } from "./utils/slots.js";

// Field review: annotations a reviewer leaves on a filled form
export { FieldAnnotation, FieldAnnotations, flaggedKeys } from "./review.js";

// Spec diagnostics
export { SpecIssue, SpecIssueCode, lintSpec } from "./utils/lint-spec.js";

// Brick identity, owned by the builder rather than the stored spec
export {
    ensureBrickUids,
    stripBrickUids,
    stripUidsFromPatches
} from "./ops/uids.js";

// Remote-options plumbing, shared by every renderer
export {
    interpolateTemplate,
    parseHeaderLines,
    appendSearchParam
} from "./utils/remote.js";

// Brick
export { PanelBrickProps, InputBrickProps, CollectionBrickProps } from "./brick/types.js";
export { Brick, BrickProps } from "./brick/brick.js";

// Brick utils functions
export {
    CommonUtils,
    PanelUtils,
    InputUtils,
    CollectionUtils,
    ActionUtils,
    Utils,
    getAffectedProperties,
    evalBrickCode
} from "./brick/utils.js";

// Rules
export { Rule } from "./rules/rule.js";
export { Effect } from "./rules/effect.js";
// Validators
export {
    Validator,
    ValidationResult,
    validateBrickSpecData,
    validateBrickSpecDataDetailed,
    validateFormData
} from "./validators/validator.js";
export {
    defaultValidationMessage,
    registerValidationMessages
} from "./validators/default-messages.js";
export { Validation } from "./validators/validation.js";
export { JSONSchemaType } from "./validators/json-schema-type.js";

// Services
export { services } from "./services/index.js";
export {
    JsRunnerService,
    JsValidationResult,
    SandboxJsRunnerService
} from "./services/js_runner_service.js";
export { UnsafeEvalJsRunnerService } from "./services/unsafe_js_runner_service.js";
export { runSandboxed } from "./services/sandbox_interpreter.js";
export { DataSourceService, FetchDataSourceService } from "./services/data_source_service.js";
export {
    FileLike,
    UploadedFile,
    FileUploadService,
    FileUploadOptions,
    Base64FileUploadService,
    UrlFileUploadService,
    UrlFileUploadDefaults
} from "./services/file_upload_service.js";

// Localized content
export {
    LocalizedText,
    isLocalizedObject,
    resolveLocalizedText,
    resolveLocalizedRecord
} from "./utils/localized-text.js";

// Chrome translations, shared by every renderer (web components, native)
export {
    FkTranslations,
    setFkTranslations,
    fkT,
    fkTOr,
    frFkTranslations
} from "./i18n.js";

// Spec operations
export { pointerFromPath, getBrickAt } from "./ops/pointer.js";
export {
    SpecUpdate,
    addBrick,
    removeBrick,
    moveBrick,
    duplicateBrick,
    updateBrickConfigs,
    updateBrickStyles,
    updateBrickValidations,
    updateBrickRules
} from "./ops/ops.js";
export { SpecHistory } from "./ops/history.js";
export type { Operation } from "fast-json-patch";

export { convertFormioForm } from "./compat/formio.js";
export type {
    FormioForm,
    FormioComponent,
    FormioConversionResult
} from "./compat/formio.js";
export { expandSpec, hasNestedForms } from "./utils/expand-spec.js";
export type { ExpandSpecOptions } from "./utils/expand-spec.js";
export { FetchSpecSourceService } from "./services/spec_source_service.js";
export type {
    SpecSourceService,
    FetchSpecSourceDefaults
} from "./services/spec_source_service.js";
export { FetchOptionSourceService } from "./services/option_source_service.js";
export type {
    OptionSourceService,
    FetchOptionSourceDefaults
} from "./services/option_source_service.js";
