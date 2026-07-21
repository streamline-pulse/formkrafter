const DEFAULT_MESSAGES: Record<string, Record<string, string>> = {
  en: {
    required: "This field is required",
    minLength: "Must be at least {value} characters",
    maxLength: "Must be at most {value} characters",
    min: "Must be at least {value}",
    max: "Must be at most {value}",
    pattern: "Invalid format",
    email: "Invalid email address",
    url: "Invalid URL",
    type: "Invalid value",
    custom: "Invalid value",
  },
  fr: {
    required: "Ce champ est obligatoire",
    minLength: "Minimum {value} caractères",
    maxLength: "Maximum {value} caractères",
    min: "Minimum {value}",
    max: "Maximum {value}",
    pattern: "Format invalide",
    email: "Adresse email invalide",
    url: "URL invalide",
    type: "Valeur invalide",
    custom: "Valeur invalide",
  },
};

export function registerValidationMessages(
  locale: string,
  messages: Record<string, string>
): void {
  DEFAULT_MESSAGES[locale] = { ...DEFAULT_MESSAGES[locale], ...messages };
}

export function defaultValidationMessage(
  validator: string,
  locale?: string,
  value?: unknown
): string {
  const pack = DEFAULT_MESSAGES[locale ?? "en"] ?? DEFAULT_MESSAGES.en;
  const template =
    pack[validator] ?? DEFAULT_MESSAGES.en[validator] ?? "Invalid value";

  return template.replace("{value}", String(value ?? ""));
}
