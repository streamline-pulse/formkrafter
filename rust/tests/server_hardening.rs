use formkrafter::js::{self, Js};
use formkrafter::{assert_supported, get_affected_properties, jsonlogic, validate_form_data};
use formkrafter::{JavaScriptMode, ValidateError};
use serde_json::{json, Value};

fn form(children: Value) -> Value {
    json!({ "type": "panel", "children": children })
}

fn text_field(key: &str, validations: Value) -> Value {
    json!({ "type": "input", "id": "text", "dataType": "string", "configs": { "key": key }, "validations": validations })
}

fn verdict(spec: &Value, data: Value) -> Result<Vec<String>, ValidateError> {
    validate_form_data(spec, &Js::from_json(&data), Some("en"), None)
        .map(|result| result.errors.into_iter().map(|(key, _)| key).collect())
}

fn matches(pattern: &str, value: &str) -> bool {
    js::compile_pattern(pattern)
        .expect("compiles")
        .is_match(value)
}

#[test]
fn a_schema_that_does_not_compile_is_refused() {
    let spec = form(json!([
        { "type": "input", "id": "text", "dataType": "number", "configs": { "key": "n" },
          "validations": [{ "validator": "min", "value": "abc" }] },
        text_field("email", json!([{ "validator": "required" }]))
    ]));
    assert!(matches!(
        verdict(&spec, json!({})),
        Err(ValidateError::SchemaInvalid(_))
    ));
}

#[test]
fn a_pattern_the_server_cannot_run_is_refused_up_front() {
    let spec = form(json!([text_field(
        "pwd",
        json!([{ "validator": "pattern", "value": "^(?=.*[0-9]).{8,}$" }])
    )]));
    assert!(matches!(
        assert_supported(&spec),
        Err(ValidateError::SpecNotSupported(_))
    ));
    assert!(verdict(&spec, json!({ "pwd": "short" })).is_err());
}

#[test]
fn an_mrz_without_its_zone_is_invalid() {
    let spec = form(json!([
        { "type": "input", "id": "mrz", "dataType": "object", "configs": { "key": "doc" } }
    ]));
    assert_eq!(
        verdict(&spec, json!({ "doc": { "valid": true } })).unwrap(),
        vec!["doc"]
    );
}

#[test]
fn parse_float_reads_only_a_leading_number() {
    assert!(js::parse_float(&Js::Str("abc5".into())).is_nan());
    assert_eq!(js::parse_float(&Js::Str("  5px".into())), 5.0);
    let sum = jsonlogic::apply(&Js::from_json(&json!({ "+": ["abc5", 1] })), &Js::Null).unwrap();
    assert!(matches!(sum, Js::Float(n) if n.is_nan()));
}

#[test]
fn number_parses_prefixed_strings_like_javascript() {
    assert!(js::to_number(&Js::Str("0x+1".into())).is_nan());
    assert!(js::to_number(&Js::Str("0x".into())).is_nan());
    assert_eq!(js::to_number(&Js::Str("0x1F".into())), 31.0);
    assert_eq!(js::to_number(&Js::Str("0b101".into())), 5.0);
    let big = format!("0x{}", "F".repeat(40));
    assert!(js::to_number(&Js::Str(big)) > 1e47);
}

#[test]
fn patterns_follow_javascript_semantics() {
    assert!(!matches("^a.b$", "a\rb"));
    assert!(!matches("^a.b$", "a\u{2028}b"));
    assert!(matches("^a.b$", "aéb"));
    assert!(matches(r"^\s$", "\u{feff}"));
    assert!(!matches(r"^\s$", "\u{85}"));
    assert!(matches(r"^\w+\b", "abcé"));
    assert!(matches(r"^[\D]+$", "é"));
    assert!(!matches(r"^[\D]+$", "1"));
    assert!(matches(r"^[\s\d]+$", "1 2"));
    assert!(matches(r"^[[a]+$", "[a"));
    assert!(matches(r"^[a&&b]+$", "a&b"));
    assert!(!matches("^[]$", ""));
    assert!(matches("^[^]$", "\n"));
    assert!(matches(r"^a\0b$", "a\0b"));
    assert!(matches(r"^\cJ$", "\n"));
    assert!(matches(r"^(?<year>[0-9]{4})$", "2026"));
    assert!(!matches("^a$", "a\n"));
}

#[test]
fn jsonlogic_indexes_strings_by_utf16_units() {
    let data = Js::from_json(&json!({ "s": "😀a" }));
    let second = jsonlogic::apply(&Js::from_json(&json!({ "var": "s.2" })), &data).unwrap();
    assert_eq!(second, Js::Str("a".into()));
}

#[test]
fn jsonlogic_all_stops_at_the_first_falsy_item() {
    let logic = json!({ "all": [[0, 1], { "if": [{ "var": "" }, { "unknown_op": [] }, false] }] });
    assert_eq!(
        jsonlogic::apply(&Js::from_json(&logic), &Js::Null).unwrap(),
        Js::Bool(false)
    );
}

#[test]
fn an_effect_without_target_is_keyed_undefined() {
    let rules = vec![json!({
        "type": "jsonLogic", "logic": true,
        "effects": [{ "property": { "type": "boolean" }, "boolean": true }]
    })];
    let properties =
        get_affected_properties(Some(&rules), &Js::Null, JavaScriptMode::Skip).unwrap();
    assert_eq!(properties[0].0, "undefined");
}
