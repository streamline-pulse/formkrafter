import type { Validator } from "./validator";
import type { LocalizedText } from "../utils/localized-text";

export type Validation = {
    validator: Validator;
    message?: LocalizedText;
    value?: unknown;
    customValidator?: string;
}
