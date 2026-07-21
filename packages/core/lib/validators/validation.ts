import type { Validator } from "./validator";

export type Validation = {
    validator: Validator;
    message?: string;
    value?: unknown;
    customValidator?: string;
}
