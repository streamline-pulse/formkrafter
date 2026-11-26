//! Brick rules — `getAffectedProperties` in `brick/utils.ts`: which rules are active on the data,
//! and what their effects set (`hidden`, `disabled`, `required`, `value`).
//!
//! JsonLogic rules and effects are evaluated as in the browser. JavaScript rules and `code`
//! effects run in the browser's sandbox only: they raise `JavaScriptRule`, unless
//! `JavaScriptMode::Skip` treats them as inactive.

use std::collections::HashSet;
use std::fmt;

use serde_json::{Map, Value};

use crate::js::Js;
use crate::jsonlogic::{self, JsonLogicError};
use crate::spec::{as_spec, configs_of};

/// A rule or an effect written in JavaScript, which the server does not run.
#[derive(Clone, Debug)]
pub struct JavaScriptRule(pub String);

impl fmt::Display for JavaScriptRule {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl std::error::Error for JavaScriptRule {}

#[derive(Clone, Debug)]
pub enum RuleError {
    JavaScript(JavaScriptRule),
    JsonLogic(JsonLogicError),
}

impl fmt::Display for RuleError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            RuleError::JavaScript(e) => e.fmt(f),
            RuleError::JsonLogic(e) => e.fmt(f),
        }
    }
}

impl std::error::Error for RuleError {}

impl From<JsonLogicError> for RuleError {
    fn from(error: JsonLogicError) -> Self {
        RuleError::JsonLogic(error)
    }
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum JavaScriptMode {
    Raise,
    Skip,
}

fn is_js_rule(rule: &Map<String, Value>) -> bool {
    rule.get("type").and_then(Value::as_str) == Some("javaScript")
        && rule
            .get("code")
            .and_then(Value::as_str)
            .is_some_and(|c| !c.is_empty())
}

/// True when the rule's condition holds: a JsonLogic result of exactly `true`.
pub fn is_rule_active(
    rule: &Map<String, Value>,
    data: &Js,
    javascript: JavaScriptMode,
) -> Result<bool, RuleError> {
    if rule.get("type").and_then(Value::as_str) == Some("jsonLogic") {
        return match rule.get("logic") {
            Some(logic) => Ok(matches!(
                jsonlogic::apply(&Js::from_json(logic), data)?,
                Js::Bool(true)
            )),
            None => Ok(false),
        };
    }
    if is_js_rule(rule) {
        if javascript == JavaScriptMode::Raise {
            let name = rule.get("name").and_then(Value::as_str).unwrap_or("");
            return Err(RuleError::JavaScript(JavaScriptRule(format!(
                "rule {name:?} is JavaScript"
            ))));
        }
        return Ok(false);
    }
    Ok(false)
}

/// The properties the active rules set, later effects overriding earlier ones.
///
/// `{"hidden": true, "disabled": false}`; a property an effect leaves unset maps to `Undefined`.
/// No rules at all maps to `{"hidden": false}`.
pub fn get_affected_properties(
    rules: Option<&Vec<Value>>,
    data: &Js,
    javascript: JavaScriptMode,
) -> Result<Vec<(String, Js)>, RuleError> {
    let rules = match rules {
        None => return Ok(vec![("hidden".to_string(), Js::Bool(false))]),
        Some(rules) => rules,
    };
    let mut properties: Vec<(String, Js)> = Vec::new();
    for rule in rules {
        let rule = match rule.as_object() {
            Some(rule) => rule,
            None => continue,
        };
        if !is_rule_active(rule, data, javascript)? {
            continue;
        }
        let effects = match rule.get("effects") {
            Some(Value::Array(effects)) => effects,
            _ => continue,
        };
        for effect in effects {
            let effect = match effect.as_object() {
                Some(effect) => effect,
                None => continue,
            };
            let property = match effect.get("property").and_then(Value::as_object) {
                Some(property) => property,
                None => continue,
            };
            let target = property.get("target");
            let kind = property.get("type").and_then(Value::as_str);
            let value = match kind {
                Some("boolean") => effect
                    .get("boolean")
                    .map(Js::from_json)
                    .unwrap_or(Js::Undefined),
                Some("logic") => match effect.get("logic") {
                    Some(logic) => jsonlogic::apply(&Js::from_json(logic), data)?,
                    None => Js::Undefined,
                },
                Some("code") => {
                    let has_code = effect
                        .get("code")
                        .and_then(Value::as_str)
                        .is_some_and(|c| !c.is_empty());
                    if has_code && javascript == JavaScriptMode::Raise {
                        let name = rule.get("name").and_then(Value::as_str).unwrap_or("");
                        return Err(RuleError::JavaScript(JavaScriptRule(format!(
                            "an effect of rule {name:?} is JavaScript"
                        ))));
                    }
                    Js::Undefined
                }
                Some("string") => effect
                    .get("string")
                    .map(Js::from_json)
                    .unwrap_or(Js::Undefined),
                _ => Js::Undefined,
            };
            let target = match target {
                Some(Value::String(t)) => t.clone(),
                Some(other) => crate::js::to_string(&Js::from_json(other)),
                None => "None".to_string(),
            };
            match properties.iter_mut().find(|(k, _)| *k == target) {
                Some((_, slot)) => *slot = value,
                None => properties.push((target, value)),
            }
        }
    }
    Ok(properties)
}

/// The keys the rules hide on this data: a hidden panel hides everything under it, collections
/// stop the walk (their rows have their own rules).
pub fn hidden_keys(
    spec: &Value,
    data: &Js,
    javascript: JavaScriptMode,
) -> Result<HashSet<String>, RuleError> {
    let mut hidden = HashSet::new();
    let spec = match as_spec(spec) {
        Some(spec) => spec,
        None => return Ok(hidden),
    };
    walk_hidden(spec, data, javascript, false, &mut hidden)?;
    Ok(hidden)
}

fn walk_hidden(
    brick: &Map<String, Value>,
    data: &Js,
    javascript: JavaScriptMode,
    parent_hidden: bool,
    hidden: &mut HashSet<String>,
) -> Result<(), RuleError> {
    let rules = match brick.get("rules") {
        Some(Value::Array(rules)) => Some(rules),
        _ => None,
    };
    let is_hidden = parent_hidden
        || match rules {
            Some(rules) if !rules.is_empty() => {
                get_affected_properties(Some(rules), data, javascript)?
                    .iter()
                    .any(|(k, v)| k == "hidden" && matches!(v, Js::Bool(true)))
            }
            _ => false,
        };
    if is_hidden {
        if let Some(key) = configs_of(brick).get("key").and_then(Value::as_str) {
            if !key.is_empty() {
                hidden.insert(key.to_string());
            }
        }
    }
    if brick.get("type").and_then(Value::as_str) == Some("collection") {
        return Ok(());
    }
    if let Some(Value::Array(children)) = brick.get("children") {
        for child in children {
            if let Some(child) = child.as_object() {
                walk_hidden(child, data, javascript, is_hidden, hidden)?;
            }
        }
    }
    Ok(())
}

/// Names of the brick's rules whose hiding depends on JavaScript.
pub fn javascript_hiding(brick: &Map<String, Value>) -> Vec<String> {
    let mut out = Vec::new();
    let rules = match brick.get("rules") {
        Some(Value::Array(rules)) => rules,
        _ => return out,
    };
    for rule in rules {
        let rule = match rule.as_object() {
            Some(rule) => rule,
            None => continue,
        };
        let effects: Vec<&Map<String, Value>> = match rule.get("effects") {
            Some(Value::Array(effects)) => effects.iter().filter_map(Value::as_object).collect(),
            _ => Vec::new(),
        };
        let hides: Vec<&&Map<String, Value>> = effects
            .iter()
            .filter(|e| {
                e.get("property")
                    .and_then(Value::as_object)
                    .and_then(|p| p.get("target"))
                    .and_then(Value::as_str)
                    == Some("hidden")
            })
            .collect();
        if hides.is_empty() {
            continue;
        }
        let code_hides = hides.iter().any(|e| {
            e.get("property")
                .and_then(Value::as_object)
                .and_then(|p| p.get("type"))
                .and_then(Value::as_str)
                == Some("code")
                && e.get("code")
                    .and_then(Value::as_str)
                    .is_some_and(|c| !c.is_empty())
        });
        if is_js_rule(rule) || code_hides {
            out.push(
                rule.get("name")
                    .map(|n| match n {
                        Value::String(s) => s.clone(),
                        other => crate::js::to_string(&Js::from_json(other)),
                    })
                    .unwrap_or_else(|| "None".to_string()),
            );
        }
    }
    out
}
