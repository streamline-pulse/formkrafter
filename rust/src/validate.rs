//! Form data validation — `validators/validator.ts` in the core, with Ajv replaced by the handful
//! of keywords `build_validation_schema` emits, evaluated the way Ajv and ajv-errors report them.
//!
//! Same spec, same data: same error keys (`items[0].hs_code`), same messages, same warnings as
//! the browser.

use std::collections::HashMap;
use std::fmt;

use regex::Regex;
use serde_json::{Map, Value};

use crate::identity::{self, parse_mrz};
use crate::js::{self, Js};
use crate::lint::validation_warnings;
use crate::rules::{self, JavaScriptMode, RuleError};
use crate::spec::{self, as_spec, build_validation_schema, configs_of};

/// The spec relies on something the Rust port does not check: refused rather than half validated.
#[derive(Clone, Debug)]
pub struct SpecNotSupported(pub String);

impl fmt::Display for SpecNotSupported {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl std::error::Error for SpecNotSupported {}

#[derive(Clone, Debug)]
pub enum ValidateError {
    SpecNotSupported(SpecNotSupported),
    Rule(RuleError),
}

impl fmt::Display for ValidateError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ValidateError::SpecNotSupported(e) => e.fmt(f),
            ValidateError::Rule(e) => e.fmt(f),
        }
    }
}

impl std::error::Error for ValidateError {}

impl From<RuleError> for ValidateError {
    fn from(error: RuleError) -> Self {
        ValidateError::Rule(error)
    }
}

/// One error with its validator, so an API can return a stable code and let the client word it.
#[derive(Clone, Debug)]
pub struct ErrorDetail {
    pub validator: String,
    pub message: String,
    pub value: Value,
}

impl ErrorDetail {
    pub fn to_dict(&self) -> Value {
        let mut out = Map::new();
        out.insert(
            "validator".to_string(),
            Value::String(self.validator.clone()),
        );
        out.insert("value".to_string(), self.value.clone());
        out.insert("message".to_string(), Value::String(self.message.clone()));
        Value::Object(out)
    }
}

#[derive(Clone, Debug, Default)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<(String, String)>,
    pub details: Vec<(String, ErrorDetail)>,
    pub warnings: Vec<String>,
}

impl ValidationResult {
    /// The result as the core's `validateFormData` returns it.
    pub fn to_dict(&self) -> Value {
        let mut out = Map::new();
        out.insert("valid".to_string(), Value::Bool(self.valid));
        out.insert(
            "errors".to_string(),
            Value::Object(
                self.errors
                    .iter()
                    .map(|(k, v)| (k.clone(), Value::String(v.clone())))
                    .collect(),
            ),
        );
        if !self.warnings.is_empty() {
            out.insert(
                "warnings".to_string(),
                Value::Array(
                    self.warnings
                        .iter()
                        .map(|w| Value::String(w.clone()))
                        .collect(),
                ),
            );
        }
        Value::Object(out)
    }
}

type FormatCheck = Box<dyn Fn(&str) -> bool>;

// The formats the core registers on Ajv (validators/validator.ts); any other one fails the compilation.
fn format_check(format: &str) -> Option<FormatCheck> {
    if let Some(kind) = format.strip_prefix("identity-") {
        let known = matches!(
            kind,
            "fr-nir" | "bj-npi" | "fr-siren" | "fr-siret" | "bj-ifu" | "iban"
        ) || kind.strip_prefix("digits-").is_some_and(|n| {
            n.parse::<usize>()
                .ok()
                .is_some_and(|v| (1..=20).contains(&v) && v.to_string() == n)
        });
        if known {
            let kind = kind.to_string();
            return Some(Box::new(move |value: &str| {
                identity::check_identity(&kind, value)
            }));
        }
        return None;
    }
    if let Some(id) = format.strip_prefix("plate-") {
        if identity::plate_format_ids().contains(&id) {
            let id = id.to_string();
            return Some(Box::new(move |value: &str| {
                identity::check_plate(&id, value)
            }));
        }
        return None;
    }
    if let Some(id) = format.strip_prefix("registry-") {
        if identity::registry_format_ids().contains(&id) {
            let id = id.to_string();
            return Some(Box::new(move |value: &str| {
                identity::check_company_registry(&id, value)
            }));
        }
        return None;
    }
    match format {
        "email" => Some(Box::new(|value: &str| {
            js::check_format("email", value).unwrap_or(false)
        })),
        "uri" => Some(Box::new(|value: &str| {
            js::check_format("uri", value).unwrap_or(false)
        })),
        _ => None,
    }
}

fn is_number(value: &Js) -> bool {
    matches!(value, Js::Int(_) | Js::Float(_))
}

fn type_matches(type_name: &str, value: &Js) -> bool {
    match type_name {
        "string" => matches!(value, Js::Str(_)),
        "number" => is_number(value),
        "integer" => match value {
            Js::Int(_) => true,
            Js::Float(n) => n.is_finite() && n.fract() == 0.0,
            _ => false,
        },
        "boolean" => matches!(value, Js::Bool(_)),
        "object" => matches!(value, Js::Obj(_)),
        "array" => matches!(value, Js::Arr(_)),
        "null" => matches!(value, Js::Null),
        _ => false,
    }
}

struct Compiled {
    patterns: HashMap<String, Regex>,
}

/// The keywords of a property schema that the value fails, each applied to the types Ajv applies
/// it to.
fn failing_keywords(prop: &Map<String, Value>, value: &Js, compiled: &Compiled) -> Vec<String> {
    let mut failing = Vec::new();
    let nullable = prop.get("nullable") == Some(&Value::Bool(true));
    let types: Vec<&str> = match prop.get("type") {
        Some(Value::String(t)) => vec![t.as_str()],
        Some(Value::Array(items)) => items.iter().filter_map(Value::as_str).collect(),
        _ => vec![],
    };
    if !(nullable && matches!(value, Js::Null)) && !types.iter().any(|t| type_matches(t, value)) {
        failing.push("type".to_string());
    }
    if let Js::Str(text) = value {
        if let Some(min) = prop.get("minLength").and_then(Value::as_f64) {
            if (text.chars().count() as f64) < min {
                failing.push("minLength".to_string());
            }
        }
        if let Some(max) = prop.get("maxLength").and_then(Value::as_f64) {
            if (text.chars().count() as f64) > max {
                failing.push("maxLength".to_string());
            }
        }
        if let Some(Value::String(pattern)) = prop.get("pattern") {
            if let Some(re) = compiled.patterns.get(pattern) {
                if !re.is_match(text) {
                    failing.push("pattern".to_string());
                }
            }
        }
        if let Some(Value::String(format)) = prop.get("format") {
            if let Some(check) = format_check(format) {
                if !check(text) {
                    failing.push("format".to_string());
                }
            }
        }
    }
    if is_number(value) {
        let n = js::to_number(value);
        if let Some(min) = prop.get("minimum").and_then(Value::as_f64) {
            if n < min {
                failing.push("minimum".to_string());
            }
        }
        if let Some(max) = prop.get("maximum").and_then(Value::as_f64) {
            if n > max {
                failing.push("maximum".to_string());
            }
        }
    }
    if let Js::Arr(items) = value {
        if let Some(min) = prop.get("minItems").and_then(Value::as_f64) {
            if (items.len() as f64) < min {
                failing.push("minItems".to_string());
            }
        }
        if let Some(max) = prop.get("maxItems").and_then(Value::as_f64) {
            if (items.len() as f64) > max {
                failing.push("maxItems".to_string());
            }
        }
    }
    if prop.get("dateRange") == Some(&Value::Bool(true)) {
        if let Js::Obj(_) = value {
            let start = value.get("from");
            let end = value.get("to");
            if js::js_truthy(start)
                && js::js_truthy(end)
                && !matches!(js::js_compare(start, end), Some(-1) | Some(0))
            {
                failing.push("dateRange".to_string());
            }
        }
    }
    if prop.get("mrzValid") == Some(&Value::Bool(true)) {
        if let Js::Obj(_) = value {
            if !mrz_valid(value) {
                failing.push("mrzValid".to_string());
            }
        }
    }
    failing
}

fn mrz_valid(value: &Js) -> bool {
    if value.get("valid") != &Js::Bool(true) {
        return false;
    }
    if let Js::Str(raw) = value.get("raw") {
        return parse_mrz(raw, None).is_some_and(|parsed| parsed.valid);
    }
    true
}

/// The checks Ajv runs when it compiles the schema (meta-schema, regular expressions); raises on
/// failure.
fn compile_schema(schema: &Map<String, Value>) -> Result<Compiled, String> {
    let mut patterns = HashMap::new();
    let empty = Map::new();
    let properties = match schema.get("properties") {
        Some(Value::Object(p)) => p,
        _ => &empty,
    };
    for (key, prop) in properties {
        let prop = match prop.as_object() {
            Some(p) => p,
            None => continue,
        };
        if let Some(Value::String(format)) = prop.get("format") {
            if format_check(format).is_none() {
                return Err(format!(
                    "unknown format \"{format}\" ignored in schema at path \"#/properties/{key}\""
                ));
            }
        }
        for keyword in ["minLength", "maxLength", "minItems", "maxItems"] {
            if let Some(n) = prop.get(keyword) {
                let ok = match n {
                    Value::Number(n) => n
                        .as_f64()
                        .is_some_and(|f| f.is_finite() && f >= 0.0 && f.fract() == 0.0),
                    _ => false,
                };
                if !ok {
                    return Err(format!(
                        "schema is invalid: data/properties/{key}/{keyword} must be integer >= 0"
                    ));
                }
            }
        }
        for keyword in ["minimum", "maximum"] {
            if let Some(n) = prop.get(keyword) {
                let ok = match n {
                    Value::Number(n) => n.as_f64().is_some_and(|f| f.is_finite()),
                    _ => false,
                };
                if !ok {
                    return Err(format!(
                        "schema is invalid: data/properties/{key}/{keyword} must be number"
                    ));
                }
            }
        }
        if let Some(Value::String(pattern)) = prop.get("pattern") {
            if !patterns.contains_key(pattern) {
                match js::compile_pattern(pattern) {
                    Ok(re) => {
                        patterns.insert(pattern.clone(), re);
                    }
                    Err(error) => {
                        return Err(format!("Invalid regular expression: /{pattern}/: {error}"));
                    }
                }
            }
        }
    }
    Ok(Compiled { patterns })
}

fn validator_of(keyword: &str) -> &str {
    match keyword {
        "type" => "type",
        "minLength" => "minLength",
        "maxLength" => "maxLength",
        "minimum" => "min",
        "maximum" => "max",
        "pattern" => "pattern",
        "minItems" => "minItems",
        "maxItems" => "maxItems",
        "dateRange" => "dateRange",
        "mrzValid" => "mrz",
        _ => keyword,
    }
}

fn detail(keyword: &str, prop: &Map<String, Value>, message: &str) -> ErrorDetail {
    if keyword == "format" {
        let name = prop.get("format").and_then(Value::as_str).unwrap_or("");
        match name {
            "email" => {
                return ErrorDetail {
                    validator: "email".to_string(),
                    message: message.to_string(),
                    value: Value::Null,
                }
            }
            "uri" => {
                return ErrorDetail {
                    validator: "url".to_string(),
                    message: message.to_string(),
                    value: Value::Null,
                }
            }
            "identity-iban" => {
                return ErrorDetail {
                    validator: "iban".to_string(),
                    message: message.to_string(),
                    value: Value::Null,
                }
            }
            _ => {
                let (family, variant) = name.split_once('-').unwrap_or((name, ""));
                return ErrorDetail {
                    validator: family.to_string(),
                    message: message.to_string(),
                    value: Value::String(variant.to_string()),
                };
            }
        }
    }
    if keyword == "type" {
        return ErrorDetail {
            validator: "type".to_string(),
            message: message.to_string(),
            value: prop.get("type").cloned().unwrap_or(Value::Null),
        };
    }
    if keyword == "dateRange" || keyword == "mrzValid" {
        return ErrorDetail {
            validator: validator_of(keyword).to_string(),
            message: message.to_string(),
            value: Value::Null,
        };
    }
    ErrorDetail {
        validator: validator_of(keyword).to_string(),
        message: message.to_string(),
        value: prop.get(keyword).cloned().unwrap_or(Value::Null),
    }
}

/// Empty strings and nulls count as missing.
fn strip_empty(data: &Js) -> Vec<(String, Js)> {
    match data {
        Js::Obj(entries) => entries
            .iter()
            .filter(|(_, v)| !matches!(v, Js::Null) && !matches!(v, Js::Str(s) if s.is_empty()))
            .cloned()
            .collect(),
        _ => Vec::new(),
    }
}

fn row_spec(collection: &Map<String, Value>) -> Map<String, Value> {
    let mut spec = Map::new();
    spec.insert("type".to_string(), Value::String("panel".to_string()));
    spec.insert(
        "id".to_string(),
        Value::String("collection-row".to_string()),
    );
    spec.insert("name".to_string(), Value::String("Row".to_string()));
    let key = configs_of(collection)
        .get("key")
        .and_then(Value::as_str)
        .unwrap_or("collection");
    let mut configs = Map::new();
    configs.insert("key".to_string(), Value::String(format!("{key}_row")));
    spec.insert("configs".to_string(), Value::Object(configs));
    spec.insert(
        "children".to_string(),
        collection
            .get("children")
            .cloned()
            .unwrap_or(Value::Array(vec![])),
    );
    spec
}

fn has_key(brick: &Map<String, Value>) -> bool {
    let mut bricks = Vec::new();
    spec::iterate_bricks(brick, "0", &mut bricks);
    bricks
        .iter()
        .any(|(b, _)| configs_of(b).get("key").is_some_and(spec::truthy))
}

/// Raise `SpecNotSupported` when validating the spec needs JavaScript, which the server does not
/// run.
///
/// Refused: custom validators (`validator: "custom"`) and rules whose hiding of a data-carrying
/// brick is decided by JavaScript. JsonLogic rules are evaluated; JavaScript rules that do not
/// hide fields cannot change the verdict and are accepted.
pub fn assert_supported(spec: &Value) -> Result<(), ValidateError> {
    let spec = match as_spec(spec) {
        Some(spec) if !spec.is_empty() => spec,
        _ => return Ok(()),
    };
    let mut bricks = Vec::new();
    spec::iterate_bricks(spec, "0", &mut bricks);
    for (brick, path) in bricks {
        if let Some(Value::Array(validations)) = brick.get("validations") {
            for validation in validations {
                let Some(validation) = validation.as_object() else {
                    continue;
                };
                let is_custom =
                    validation.get("validator").and_then(Value::as_str) == Some("custom");
                let has_code = validation.get("customValidator").is_some_and(spec::truthy);
                if is_custom && has_code {
                    return Err(ValidateError::SpecNotSupported(SpecNotSupported(format!(
                        "{} ({}): JavaScript custom validators do not run server-side",
                        path,
                        brick.get("name").and_then(Value::as_str).unwrap_or("")
                    ))));
                }
            }
        }
        let js_rules = rules::javascript_hiding(brick);
        if !js_rules.is_empty() && has_key(brick) {
            return Err(ValidateError::SpecNotSupported(SpecNotSupported(format!(
                "{} ({}): rule '{}' hides fields with JavaScript, which does not run server-side",
                path,
                brick.get("name").and_then(Value::as_str).unwrap_or(""),
                js_rules[0]
            ))));
        }
    }
    Ok(())
}

pub const COMPILE_FAILURE_PREFIX: &str =
    "the validation schema failed to compile, so no rule was enforced: ";

type Details = Vec<(String, ErrorDetail)>;

fn validate_level(
    spec: &Map<String, Value>,
    data: &[(String, Js)],
    locale: Option<&str>,
    scope: &Js,
) -> Result<(Details, Option<String>), ValidateError> {
    let schema = match build_validation_schema(spec, locale) {
        Some(schema) => schema,
        None => return Ok((Vec::new(), None)),
    };
    let schema = match schema.as_object() {
        Some(s) => s,
        None => return Ok((Vec::new(), None)),
    };
    let compiled = match compile_schema(schema) {
        Ok(compiled) => compiled,
        Err(error) => {
            // the rules still run, and may still throw
            rules::hidden_keys(&Value::Object(spec.clone()), scope, JavaScriptMode::Skip)?;
            return Ok((Vec::new(), Some(format!("{COMPILE_FAILURE_PREFIX}{error}"))));
        }
    };

    let mut details: Details = Vec::new();
    let empty = Map::new();
    let properties = match schema.get("properties") {
        Some(Value::Object(p)) => p,
        _ => &empty,
    };
    for (key, prop) in properties {
        let value = match data.iter().find(|(k, _)| k == key) {
            Some((_, v)) => v,
            None => continue,
        };
        let prop = match prop.as_object() {
            Some(p) => p,
            None => continue,
        };
        let failing = failing_keywords(prop, value, &compiled);
        // ajv-errors reports in the order of `errorMessage`; an empty message is dropped like the
        // core does
        if let Some(Value::Object(messages)) = prop.get("errorMessage") {
            for (keyword, message) in messages {
                if failing.contains(keyword) {
                    if let Some(text) = message.as_str() {
                        if !text.is_empty() {
                            details.push((key.clone(), detail(keyword, prop, text)));
                            break;
                        }
                    }
                }
            }
        }
    }
    let required: Vec<&str> = match schema.get("required") {
        Some(Value::Array(items)) => items.iter().filter_map(Value::as_str).collect(),
        _ => Vec::new(),
    };
    let required_messages = schema
        .get("errorMessage")
        .and_then(Value::as_object)
        .and_then(|e| e.get("required"))
        .and_then(Value::as_object);
    for key in required {
        let message = required_messages
            .and_then(|m| m.get(key))
            .and_then(Value::as_str);
        if !data.iter().any(|(k, _)| k == key)
            && !details.iter().any(|(k, _)| k == key)
            && message.is_some_and(|m| !m.is_empty())
        {
            details.push((
                key.to_string(),
                ErrorDetail {
                    validator: "required".to_string(),
                    message: message.unwrap_or_default().to_string(),
                    value: Value::Null,
                },
            ));
        }
    }
    // a field the rules hide is not checked (its rows still are, as in the core)
    let hidden = rules::hidden_keys(&Value::Object(spec.clone()), scope, JavaScriptMode::Skip)?;
    details.retain(|(k, _)| !hidden.contains(k));
    Ok((details, None))
}

/// Validate submitted data against a spec, as `validateFormData` does in the browser.
///
/// Empty strings and nulls count as missing; collections are validated row by row, their errors
/// keyed `items[0].field`; fields hidden by rules are not checked. `rule_scope` adds variables
/// the rules read (merged over the data, as the core does). Returns `SpecNotSupported` when the
/// spec needs JavaScript.
pub fn validate_form_data(
    spec: &Value,
    data: &Js,
    locale: Option<&str>,
    rule_scope: Option<&[(String, Js)]>,
) -> Result<ValidationResult, ValidateError> {
    assert_supported(spec)?;
    match as_spec(spec) {
        Some(spec) if !spec.is_empty() => validate(spec, data, locale, rule_scope),
        _ => Ok(ValidationResult {
            valid: true,
            ..ValidationResult::default()
        }),
    }
}

fn validate(
    spec: &Map<String, Value>,
    data: &Js,
    locale: Option<&str>,
    rule_scope: Option<&[(String, Js)]>,
) -> Result<ValidationResult, ValidateError> {
    let present = strip_empty(data);
    let scope = match rule_scope {
        Some(extra) => {
            let mut merged = present.clone();
            for (k, v) in extra {
                match merged.iter_mut().find(|(key, _)| key == k) {
                    Some((_, slot)) => *slot = v.clone(),
                    None => merged.push((k.clone(), v.clone())),
                }
            }
            Js::Obj(merged)
        }
        None => Js::Obj(present.clone()),
    };
    let (mut details, compile_failure) = validate_level(spec, &present, locale, &scope)?;

    let mut bricks = Vec::new();
    spec::iterate_schema_bricks(spec, &mut bricks);
    for brick in bricks {
        if brick.get("type").and_then(Value::as_str) != Some("collection") {
            continue;
        }
        let key = match configs_of(brick).get("key").and_then(Value::as_str) {
            Some(key) if !key.is_empty() => key,
            _ => continue,
        };
        let rows = match present.iter().find(|(k, _)| k == key) {
            Some((_, Js::Arr(rows))) => rows,
            _ => continue,
        };
        let row = row_spec(brick);
        for (index, row_data) in rows.iter().enumerate() {
            for (field_key, field_detail) in validate(&row, row_data, locale, None)?.details {
                let full_key = format!("{key}[{index}].{field_key}");
                if !details.iter().any(|(k, _)| *k == full_key) {
                    details.push((full_key, field_detail));
                }
            }
        }
    }

    let mut warnings = validation_warnings(&Value::Object(spec.clone()));
    if let Some(failure) = compile_failure {
        warnings.push(failure);
    }
    let errors: Vec<(String, String)> = details
        .iter()
        .map(|(k, d)| (k.clone(), d.message.clone()))
        .collect();
    Ok(ValidationResult {
        valid: errors.is_empty(),
        errors,
        details,
        warnings,
    })
}
