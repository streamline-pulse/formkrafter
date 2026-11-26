//! Specs: walking the brick tree, localized text and the validation schema — `utils/brick-spec.ts` in the core.

use serde_json::{Map, Value};

use crate::js;
use crate::messages::default_validation_message;

/// A brick spec is a plain JSON object.
pub fn as_spec(spec: &Value) -> Option<&Map<String, Value>> {
    spec.as_object()
}

/// JavaScript truthiness of a spec field: an empty list or object is true, "" and 0 are false.
pub fn truthy(value: &Value) -> bool {
    match value {
        Value::Null => false,
        Value::Bool(b) => *b,
        Value::Number(n) => n.as_f64() != Some(0.0),
        Value::String(s) => !s.is_empty(),
        Value::Array(_) | Value::Object(_) => true,
    }
}

fn empty_map() -> &'static Map<String, Value> {
    static EMPTY: std::sync::OnceLock<Map<String, Value>> = std::sync::OnceLock::new();
    EMPTY.get_or_init(Map::new)
}

pub fn configs_of(brick: &Map<String, Value>) -> &Map<String, Value> {
    match brick.get("configs") {
        Some(Value::Object(configs)) => configs,
        _ => empty_map(),
    }
}

/// Every brick of the tree with its path ("0.1.2"), collections included (`iterateBricks`).
pub fn iterate_bricks<'a>(
    spec: &'a Map<String, Value>,
    path: &str,
    out: &mut Vec<(&'a Map<String, Value>, String)>,
) {
    out.push((spec, path.to_string()));
    if let Some(Value::Array(children)) = spec.get("children") {
        for (index, child) in children.iter().enumerate() {
            if let Some(child) = child.as_object() {
                iterate_bricks(child, &format!("{path}.{index}"), out);
            }
        }
    }
}

/// The bricks whose data sits at this level: a collection is yielded, its rows are not
/// (`iterateSchemaBricks`).
pub fn iterate_schema_bricks<'a>(
    spec: &'a Map<String, Value>,
    out: &mut Vec<&'a Map<String, Value>>,
) {
    out.push(spec);
    if spec.get("type").and_then(Value::as_str) == Some("collection") {
        return;
    }
    if let Some(Value::Array(children)) = spec.get("children") {
        for child in children {
            if let Some(child) = child.as_object() {
                iterate_schema_bricks(child, out);
            }
        }
    }
}

pub fn is_localized_object(value: &Value) -> bool {
    match value {
        Value::Object(map) => !map.is_empty() && map.values().all(|v| v.is_string()),
        _ => false,
    }
}

/// `{"fr": "…", "en": "…"}` in the locale, else its first entry; any other value as is.
pub fn resolve_localized_text<'a>(value: &'a Value, locale: Option<&str>) -> &'a Value {
    if !is_localized_object(value) {
        return value;
    }
    let map = value.as_object().expect("checked above");
    if let Some(locale) = locale {
        if let Some(entry) = map.get(locale) {
            return entry;
        }
    }
    map.values().next().expect("non-empty")
}

/// The `defaultValue` of every keyed brick at this level, first brick wins (`defaultFormData`).
pub fn default_form_data(spec: &Map<String, Value>) -> Map<String, Value> {
    let mut defaults = Map::new();
    let mut bricks = Vec::new();
    iterate_schema_bricks(spec, &mut bricks);
    for brick in bricks {
        let configs = configs_of(brick);
        let key = configs.get("key");
        let value = configs.get("defaultValue");
        if let (Some(key), Some(value)) = (key, value) {
            if truthy(key) {
                if let Some(key) = key.as_str() {
                    defaults
                        .entry(key.to_string())
                        .or_insert_with(|| value.clone());
                }
            }
        }
    }
    defaults
}

fn message_of(raw: Option<&Value>, locale: Option<&str>) -> Option<String> {
    match raw {
        Some(raw) => match resolve_localized_text(raw, locale) {
            Value::String(s) => Some(s.clone()),
            _ => None,
        },
        None => None,
    }
}

fn message_or_default(
    raw: Option<&Value>,
    validator: &str,
    value: Option<&Value>,
    locale: Option<&str>,
) -> String {
    message_of(raw, locale).unwrap_or_else(|| default_validation_message(validator, locale, value))
}

/// The Ajv schema of the spec's top level, exactly as `buildValidationSchema` builds it.
///
/// It holds `nullable` and ajv-errors `errorMessage` keywords; collections are a single `array`
/// property, their rows being validated one by one by `validate_form_data`.
pub fn build_validation_schema(spec: &Map<String, Value>, locale: Option<&str>) -> Option<Value> {
    let mut properties = Map::new();
    let mut required: Vec<Value> = Vec::new();
    let mut required_messages = Map::new();

    let mut bricks = Vec::new();
    iterate_schema_bricks(spec, &mut bricks);
    for brick in bricks {
        let configs = configs_of(brick);
        let key = configs.get("key");
        let multiple = configs.get("multiple") == Some(&Value::Bool(true));
        let raw_data_type = brick.get("dataType");
        let is_object_type = raw_data_type.and_then(Value::as_str) == Some("object");
        let data_type = if multiple && is_object_type {
            Value::String("array".to_string())
        } else {
            raw_data_type.cloned().unwrap_or(Value::Null)
        };
        let key = match key {
            Some(k) if truthy(k) => k,
            _ => continue,
        };
        if !truthy(&data_type) || data_type == Value::String("void".to_string()) {
            continue;
        }
        let key = match key.as_str() {
            Some(k) => k.to_string(),
            None => continue,
        };

        let validations: Vec<&Map<String, Value>> = match brick.get("validations") {
            Some(Value::Array(items)) => items.iter().filter_map(Value::as_object).collect(),
            _ => Vec::new(),
        };
        let is_required = validations
            .iter()
            .find(|v| v.get("validator").and_then(Value::as_str) == Some("required"));

        let mut prop = Map::new();
        prop.insert("type".to_string(), data_type);
        prop.insert("nullable".to_string(), Value::Bool(is_required.is_none()));
        let mut messages = Map::new();
        messages.insert(
            "type".to_string(),
            Value::String(default_validation_message("type", locale, None)),
        );

        for validation in &validations {
            let validator = validation.get("validator").and_then(Value::as_str);
            let value = validation.get("value");
            let validator = match validator {
                Some(v) => v,
                None => continue,
            };
            let message = message_or_default(validation.get("message"), validator, value, locale);
            let keyword = match validator {
                "minLength" => Some("minLength"),
                "maxLength" => Some("maxLength"),
                "min" => Some("minimum"),
                "max" => Some("maximum"),
                "minItems" => Some("minItems"),
                "maxItems" => Some("maxItems"),
                _ => None,
            };
            if let (Some(keyword), Some(value)) = (keyword, value) {
                if !value.is_null() {
                    prop.insert(
                        keyword.to_string(),
                        js::number_value(js::to_number(&js::Js::from_json(value))),
                    );
                    messages.insert(keyword.to_string(), Value::String(message));
                }
            } else if validator == "pattern" {
                if let Some(Value::String(pattern)) = value {
                    if !pattern.is_empty() {
                        prop.insert("pattern".to_string(), Value::String(pattern.clone()));
                        messages.insert("pattern".to_string(), Value::String(message));
                    }
                }
            } else if validator == "email" {
                prop.insert("format".to_string(), Value::String("email".to_string()));
                messages.insert("format".to_string(), Value::String(message));
            } else if validator == "url" {
                prop.insert("format".to_string(), Value::String("uri".to_string()));
                messages.insert("format".to_string(), Value::String(message));
            }
        }

        // Identity bricks: the rule comes from the brick, not from a validation to tick.
        let brick_id = brick.get("id").and_then(Value::as_str);
        match brick_id {
            Some("iban") => {
                prop.insert(
                    "format".to_string(),
                    Value::String("identity-iban".to_string()),
                );
                messages.insert(
                    "format".to_string(),
                    Value::String(default_validation_message("iban", locale, None)),
                );
            }
            Some("national-id") | Some("tax-id") => {
                if let Some(id_format) = configs.get("idFormat").and_then(Value::as_str) {
                    if !id_format.is_empty() {
                        prop.insert(
                            "format".to_string(),
                            Value::String(format!("identity-{id_format}")),
                        );
                        messages.insert(
                            "format".to_string(),
                            Value::String(default_validation_message("identity", locale, None)),
                        );
                    }
                }
            }
            Some("date-range") => {
                prop.insert("dateRange".to_string(), Value::Bool(true));
                messages.insert(
                    "dateRange".to_string(),
                    Value::String(default_validation_message("dateRange", locale, None)),
                );
            }
            Some("vehicle-plate") => {
                let plate = configs.get("plateFormat").and_then(Value::as_str);
                let plate = match plate {
                    Some(p) if !p.is_empty() => p,
                    _ => "generic",
                };
                prop.insert(
                    "format".to_string(),
                    Value::String(format!("plate-{plate}")),
                );
                messages.insert(
                    "format".to_string(),
                    Value::String(default_validation_message("plate", locale, None)),
                );
            }
            Some("company-registry") => {
                let registry = configs.get("registryFormat").and_then(Value::as_str);
                let registry = match registry {
                    Some(r) if !r.is_empty() => r,
                    _ => "generic",
                };
                prop.insert(
                    "format".to_string(),
                    Value::String(format!("registry-{registry}")),
                );
                messages.insert(
                    "format".to_string(),
                    Value::String(default_validation_message("registry", locale, None)),
                );
            }
            Some("mrz") => {
                prop.insert("mrzValid".to_string(), Value::Bool(true));
                messages.insert(
                    "mrzValid".to_string(),
                    Value::String(default_validation_message("mrz", locale, None)),
                );
            }
            _ => {}
        }

        prop.insert("errorMessage".to_string(), Value::Object(messages));
        properties.insert(key.clone(), Value::Object(prop));

        if let Some(required_validation) = is_required {
            required.push(Value::String(key.clone()));
            required_messages.insert(
                key,
                Value::String(message_or_default(
                    required_validation.get("message"),
                    "required",
                    None,
                    locale,
                )),
            );
        }
    }

    let mut schema = Map::new();
    schema.insert("type".to_string(), Value::String("object".to_string()));
    schema.insert("properties".to_string(), Value::Object(properties));
    schema.insert("required".to_string(), Value::Array(required));
    if !required_messages.is_empty() {
        let mut error_message = Map::new();
        error_message.insert("required".to_string(), Value::Object(required_messages));
        schema.insert("errorMessage".to_string(), Value::Object(error_message));
    }
    schema.insert("additionalProperties".to_string(), Value::Bool(false));
    Some(Value::Object(schema))
}
