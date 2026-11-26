//! Spec checks — `utils/lint-spec.ts` in the core: what silently breaks validation, on the client
//! and the server.

use serde_json::{Map, Value};

use crate::spec::{configs_of, iterate_bricks, truthy};

#[derive(Clone, Debug)]
pub struct SpecIssue {
    pub code: &'static str,
    pub path: String,
    pub message: String,
    pub key: Option<String>,
}

impl SpecIssue {
    /// The issue as the core returns it (no `key` when the brick has none).
    pub fn to_dict(&self) -> Value {
        let mut out = Map::new();
        out.insert("code".to_string(), Value::String(self.code.to_string()));
        out.insert("path".to_string(), Value::String(self.path.clone()));
        if let Some(key) = &self.key {
            out.insert("key".to_string(), Value::String(key.clone()));
        }
        out.insert("message".to_string(), Value::String(self.message.clone()));
        Value::Object(out)
    }
}

/// Issues of a spec: keyless inputs, untyped validations, duplicate keys, empty collections,
/// content in a row.
pub fn lint_spec(spec: &Value) -> Vec<SpecIssue> {
    let mut issues = Vec::new();
    let mut seen: Vec<(String, String)> = Vec::new();
    let spec = match spec.as_object() {
        Some(spec) => spec,
        None => return issues,
    };
    let mut bricks = Vec::new();
    iterate_bricks(spec, "0", &mut bricks);
    for (brick, path) in bricks {
        let key = configs_of(brick).get("key");
        let has_key = key.is_some_and(truthy);
        let key_string = key.and_then(Value::as_str).map(str::to_string);
        let brick_type = brick.get("type").and_then(Value::as_str);
        let carries_data = matches!(brick_type, Some("input") | Some("collection"));

        if carries_data {
            if !has_key {
                issues.push(SpecIssue {
                    code: "input-without-key",
                    path: path.clone(),
                    message: format!(
                        "{} brick \"{}\" has no configs.key — it carries no data and is skipped by validation",
                        brick_type.unwrap_or(""),
                        brick.get("id").and_then(Value::as_str).unwrap_or("")
                    ),
                    key: None,
                });
            } else if !brick.get("dataType").is_some_and(truthy)
                || brick.get("dataType").and_then(Value::as_str) == Some("void")
            {
                let validations = match brick.get("validations") {
                    Some(Value::Array(v)) => v.len(),
                    _ => 0,
                };
                if validations > 0 {
                    issues.push(SpecIssue {
                        code: "validations-without-data-type",
                        path: path.clone(),
                        message: format!(
                            "\"{}\" declares {} validation(s) but has no dataType — they are silently skipped, on the client and on the server",
                            key_string.clone().unwrap_or_default(),
                            validations
                        ),
                        key: key_string.clone(),
                    });
                }
            }
        }

        if has_key && carries_data {
            if let Some(key) = &key_string {
                if let Some((_, previous)) = seen.iter().find(|(k, _)| k == key) {
                    issues.push(SpecIssue {
                        code: "duplicate-key",
                        path: path.clone(),
                        message: format!(
                            "key \"{key}\" is used by two bricks ({previous} and {path}) — their values collide in the form data"
                        ),
                        key: Some(key.clone()),
                    });
                } else {
                    seen.push((key.clone(), path.clone()));
                }
            }
        }

        if brick_type == Some("collection") && !brick.get("children").is_some_and(python_truthy) {
            issues.push(SpecIssue {
                code: "collection-without-children",
                path: path.clone(),
                message: format!(
                    "collection \"{}\" has no row template — it can never produce data",
                    key_string
                        .clone()
                        .or_else(|| brick.get("id").and_then(Value::as_str).map(str::to_string))
                        .unwrap_or_default()
                ),
                key: key_string.clone(),
            });
        }

        if brick_type == Some("panel") && brick.get("id").and_then(Value::as_str) == Some("row") {
            if let Some(Value::Array(children)) = brick.get("children") {
                for (index, child) in children.iter().enumerate() {
                    let Some(child) = child.as_object() else {
                        continue;
                    };
                    if child.get("type").and_then(Value::as_str) != Some("output") {
                        continue;
                    }
                    issues.push(SpecIssue {
                        code: "content-in-row",
                        path: format!("{path}.{index}"),
                        message: format!(
                            "{} brick in a row takes a column like a field and reads as a label without one — place it above or below the row",
                            child.get("id").and_then(Value::as_str).unwrap_or("")
                        ),
                        key: None,
                    });
                }
            }
        }
    }
    issues
}

/// Plain truthiness for spec fields, where an empty list or object is false.
fn python_truthy(value: &Value) -> bool {
    match value {
        Value::Null => false,
        Value::Bool(b) => *b,
        Value::Number(n) => n.as_f64() != Some(0.0),
        Value::String(s) => !s.is_empty(),
        Value::Array(items) => !items.is_empty(),
        Value::Object(map) => !map.is_empty(),
    }
}

/// The lint messages that `validate_form_data` returns as warnings.
pub fn validation_warnings(spec: &Value) -> Vec<String> {
    lint_spec(spec)
        .into_iter()
        .filter(|issue| issue.code == "validations-without-data-type")
        .map(|issue| issue.message)
        .collect()
}
