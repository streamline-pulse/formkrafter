/** What a reviewer said about one field, keyed by the brick `key`. */
export interface FieldAnnotation {
    /** The value must be corrected. */
    incorrect?: boolean;
    /** Free text shown to whoever corrects the field. */
    comment?: string;
}

export type FieldAnnotations = Record<string, FieldAnnotation>;

/** Keys flagged as incorrect: the fields a correction step lets the applicant edit. */
export const flaggedKeys = (annotations: FieldAnnotations | undefined): string[] =>
    Object.entries(annotations ?? {})
        .filter(([, annotation]) => annotation?.incorrect === true)
        .map(([key]) => key);
