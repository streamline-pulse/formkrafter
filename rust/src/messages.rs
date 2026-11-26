//! Default validation messages, per locale — `validators/default-messages.ts` in the core.

use std::collections::HashMap;
use std::sync::{LazyLock, RwLock};

use serde_json::Value;

use crate::js::{self, Js};

fn base_messages() -> HashMap<String, HashMap<String, String>> {
    let en = [
        ("required", "This field is required"),
        ("minLength", "Must be at least {value} characters"),
        ("maxLength", "Must be at most {value} characters"),
        ("min", "Must be at least {value}"),
        ("max", "Must be at most {value}"),
        ("pattern", "Invalid format"),
        ("minItems", "Select at least {value} item(s)"),
        ("maxItems", "Select at most {value} item(s)"),
        ("email", "Invalid email address"),
        ("url", "Invalid URL"),
        ("type", "Invalid value"),
        ("custom", "Invalid value"),
        ("identity", "Invalid identifier for this format"),
        ("iban", "Invalid IBAN"),
        ("dateRange", "The end before the start is not allowed"),
        ("mrz", "Machine-readable zone unreadable or inconsistent"),
        ("plate", "Invalid registration plate for this format"),
        ("registry", "Invalid registration number for this format"),
    ];
    let fr = [
        ("required", "Ce champ est obligatoire"),
        ("minLength", "Minimum {value} caractères"),
        ("maxLength", "Maximum {value} caractères"),
        ("min", "Minimum {value}"),
        ("max", "Maximum {value}"),
        ("pattern", "Format invalide"),
        ("minItems", "Sélectionnez au moins {value} élément(s)"),
        ("maxItems", "Sélectionnez au plus {value} élément(s)"),
        ("email", "Adresse email invalide"),
        ("url", "URL invalide"),
        ("type", "Valeur invalide"),
        ("custom", "Valeur invalide"),
        ("identity", "Identifiant invalide pour ce format"),
        ("iban", "IBAN invalide"),
        ("dateRange", "La fin ne peut pas précéder le début"),
        ("mrz", "Zone de lecture illisible ou incohérente"),
        ("plate", "Immatriculation invalide pour ce format"),
        (
            "registry",
            "Numéro d’immatriculation invalide pour ce format",
        ),
    ];
    let pack = |entries: [(&str, &str); 18]| {
        entries
            .into_iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect()
    };
    HashMap::from([("en".to_string(), pack(en)), ("fr".to_string(), pack(fr))])
}

static MESSAGES: LazyLock<RwLock<HashMap<String, HashMap<String, String>>>> =
    LazyLock::new(|| RwLock::new(base_messages()));

/// Add or override the default messages of a locale (`registerValidationMessages`).
///
/// Register the same messages on the client, or the server and the browser word their errors
/// differently.
pub fn register_validation_messages(locale: &str, messages: &HashMap<String, String>) {
    let mut packs = MESSAGES.write().expect("messages lock");
    let pack = packs.entry(locale.to_string()).or_default();
    for (validator, message) in messages {
        pack.insert(validator.clone(), message.clone());
    }
}

/// The default message of a validator, with `{value}` filled in; English when the locale has none.
pub fn default_validation_message(
    validator: &str,
    locale: Option<&str>,
    value: Option<&Value>,
) -> String {
    let packs = MESSAGES.read().expect("messages lock");
    let en = packs.get("en").expect("English pack");
    let pack = locale.and_then(|l| packs.get(l)).unwrap_or(en);
    let template = pack
        .get(validator)
        .or_else(|| en.get(validator))
        .map(String::as_str)
        .unwrap_or("Invalid value");
    let fill = match value {
        Some(value) => js::to_string(&Js::from_json(value)),
        None => String::new(),
    };
    template.replacen("{value}", &fill, 1)
}
