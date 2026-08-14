// Brick requirements utils
export { BrickType } from "./utils/brick-type";
export { BrickMold } from "./utils/brick-mold";
export { DropType, BrickMoldDropType, BrickSpecDropType } from "./utils/drop-type";

// Brick configs utils
export { BrickStyles } from "./utils/brick-styles";
export { BrickBaseConfigs, CommonBrickProps, WithBrickBaseConfigs } from "./utils/common-brick-props";
export {
    BrickSpec,
    buildValidationSchema,
    iterateBricks,
    iterateSchemaBricks
} from "./utils/brick-spec";

// Per-brick data plumbing, shared by every renderer
export { getBrickData, wrapBrickData } from "./utils/brick-data";

// Select option parsing, shared by every renderer
export { SelectOption, normalizeOptions } from "./utils/options";

// Recap summarization, shared by every renderer
export { RecapItem, collectRecapItems } from "./utils/recap";

// Brick identity, owned by the builder rather than the stored spec
export {
    ensureBrickUids,
    stripBrickUids,
    stripUidsFromPatches
} from "./ops/uids";

// Remote-options plumbing, shared by every renderer
export {
    interpolateTemplate,
    parseHeaderLines,
    appendSearchParam
} from "./utils/remote";

// Brick
export { PanelBrickProps, InputBrickProps, CollectionBrickProps } from "./brick/types";
export { Brick, BrickProps } from "./brick/brick";

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
} from "./brick/utils";

// Rules
export { Rule } from "./rules/rule";
export { Effect } from "./rules/effect";
// Validators
export {
    Validator,
    ValidationResult,
    validateBrickSpecData,
    validateBrickSpecDataDetailed,
    validateFormData
} from "./validators/validator";
export {
    defaultValidationMessage,
    registerValidationMessages
} from "./validators/default-messages";
export { Validation } from "./validators/validation";
export { JSONSchemaType } from "./validators/json-schema-type";

// Services
export { services } from "./services";
export {
    JsRunnerService,
    JsValidationResult,
    SandboxJsRunnerService
} from "./services/js_runner_service";
export { UnsafeEvalJsRunnerService } from "./services/unsafe_js_runner_service";
export { runSandboxed } from "./services/sandbox_interpreter";
export { DataSourceService, FetchDataSourceService } from "./services/data_source_service";
export {
    FileLike,
    UploadedFile,
    FileUploadService,
    FileUploadOptions,
    Base64FileUploadService,
    UrlFileUploadService,
    UrlFileUploadDefaults
} from "./services/file_upload_service";

// Localized content
export {
    LocalizedText,
    isLocalizedObject,
    resolveLocalizedText,
    resolveLocalizedRecord
} from "./utils/localized-text";

// Chrome translations, shared by every renderer (web components, native)
export {
    FkTranslations,
    setFkTranslations,
    fkT,
    fkTOr,
    frFkTranslations
} from "./i18n";

// Spec operations
export { pointerFromPath, pointerOfUid, getBrickAt } from "./ops/pointer";
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
} from "./ops/ops";
export { SpecHistory } from "./ops/history";
export type { Operation } from "fast-json-patch";

export { convertFormioForm } from "./compat/formio";
export type {
    FormioForm,
    FormioComponent,
    FormioConversionResult
} from "./compat/formio";
export { expandSpec, hasNestedForms } from "./utils/expand-spec";
export type { ExpandSpecOptions } from "./utils/expand-spec";
export { FetchSpecSourceService } from "./services/spec_source_service";
export type {
    SpecSourceService,
    FetchSpecSourceDefaults
} from "./services/spec_source_service";
export { FetchOptionSourceService } from "./services/option_source_service";
export type {
    OptionSourceService,
    FetchOptionSourceDefaults
} from "./services/option_source_service";
