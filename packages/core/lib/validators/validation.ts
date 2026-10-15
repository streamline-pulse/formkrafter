import type { Validator } from "./validator.js";
import type { LocalizedText } from "../utils/localized-text.js";

export type Validation = {
    validator: Validator;
    message?: LocalizedText;
    value?: unknown;
    customValidator?: string;
}
