//! The port against the core: every case of parity/cases.json compiled and validated by both,
//! every rule of parity/jsonlogic.json evaluated by both, and the identifier helpers of
//! parity/utils.json.
//!
//! parity/expected.json is written by the core (`bun scripts/python-parity.ts`); CI regenerates
//! it and fails when it is stale, so a core change the port does not follow shows up here.

use std::path::{Path, PathBuf};
use std::sync::OnceLock;

use formkrafter::identity::{
    check_company_registry, check_identity, check_plate, format_company_registry, format_iban,
    format_plate, parse_mrz,
};
use formkrafter::js::Js;
use formkrafter::{build_validation_schema, CORE_VERSION};
use formkrafter::{jsonlogic, lint_spec, validate_form_data, ValidateError};
use serde_json::Value;

fn parity_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../python/tests/parity")
}

fn load(name: &str) -> Value {
    let path = parity_dir().join(name);
    serde_json::from_str(&std::fs::read_to_string(&path).expect("fixture file"))
        .expect("fixture json")
}

fn cases() -> &'static Value {
    static VALUE: OnceLock<Value> = OnceLock::new();
    VALUE.get_or_init(|| load("cases.json"))
}

fn expected() -> &'static Value {
    static VALUE: OnceLock<Value> = OnceLock::new();
    VALUE.get_or_init(|| load("expected.json"))
}

fn logic() -> &'static Value {
    static VALUE: OnceLock<Value> = OnceLock::new();
    VALUE.get_or_init(|| load("jsonlogic.json"))
}

fn utils() -> &'static Value {
    static VALUE: OnceLock<Value> = OnceLock::new();
    VALUE.get_or_init(|| load("utils.json"))
}

fn case_data(name: &str) -> &'static Value {
    cases()
        .as_array()
        .expect("cases array")
        .iter()
        .find(|c| c["name"] == name)
        .expect("case exists")
}

const COMPILE_FAILURE: &str = "the validation schema failed to compile, so no rule was enforced: ";

#[test]
fn fixtures_come_from_the_core_this_version_follows() {
    assert_eq!(expected()["core"], CORE_VERSION);
}

#[test]
fn same_schema() {
    for case in expected()["cases"].as_array().expect("cases") {
        let name = case["name"].as_str().expect("name");
        let spec = &case_data(name)["spec"];
        for locale_entry in case["locales"].as_array().expect("locales") {
            let locale = locale_entry["locale"].as_str();
            let schema = build_validation_schema(spec.as_object().expect("spec object"), locale)
                .map(|s| Js::from_json(&s).as_json());
            assert_eq!(
                schema.as_ref().unwrap_or(&Value::Null),
                &locale_entry["schema"],
                "schema [{name}] locale {locale:?}"
            );
        }
    }
}

#[test]
fn same_lint() {
    for case in expected()["cases"].as_array().expect("cases") {
        let name = case["name"].as_str().expect("name");
        let issues: Vec<Value> = lint_spec(&case_data(name)["spec"])
            .iter()
            .map(|i| i.to_dict())
            .collect();
        assert_eq!(Value::Array(issues), case["lint"], "lint [{name}]");
    }
}

#[test]
fn same_verdict() {
    for case in expected()["cases"].as_array().expect("cases") {
        let name = case["name"].as_str().expect("name");
        let spec = &case_data(name)["spec"];
        let data = case_data(name)["data"].as_array().expect("data");
        for locale in case["locales"].as_array().expect("locales") {
            let locale_name = locale["locale"].as_str();
            let results = locale["results"].as_array().expect("results");
            for (sample, verdict) in data.iter().zip(results) {
                let sample_js = Js::from_json(sample);
                if let Some(error) = verdict.get("error").and_then(Value::as_str) {
                    let outcome = validate_form_data(spec, &sample_js, locale_name, None);
                    assert!(
                        outcome.is_err(),
                        "[{name}] locale {locale_name:?}: expected an error like {error}"
                    );
                    continue;
                }
                if browser_enforced_nothing(verdict) {
                    let outcome = validate_form_data(spec, &sample_js, locale_name, None);
                    assert!(
                        matches!(
                            outcome,
                            Err(ValidateError::SchemaInvalid(_) | ValidateError::SpecNotSupported(_))
                        ),
                        "[{name}] locale {locale_name:?}: the server must refuse a schema that does not compile, got {outcome:?}"
                    );
                    continue;
                }
                let result = validate_form_data(spec, &sample_js, locale_name, None)
                    .expect("validation runs")
                    .to_dict();
                assert_eq!(
                    result,
                    *verdict,
                    "verdict [{name}] locale {locale_name:?} on {}",
                    serde_json::to_string(sample).expect("sample json")
                );
                let order =
                    |v: &Value| v["errors"].as_object().map(v_key_order).unwrap_or_default();
                assert_eq!(order(&result), order(verdict), "error key order [{name}]");
            }
        }
    }
}

fn browser_enforced_nothing(verdict: &Value) -> bool {
    verdict["warnings"].as_array().is_some_and(|w| {
        w.iter()
            .any(|w| w.as_str().is_some_and(|t| t.starts_with(COMPILE_FAILURE)))
    })
}

#[test]
fn server_refuses_a_forged_mrz_flag() {
    let spec = &case_data("identifiers")["spec"];
    let forged = &case_data("identifiers")["data"][2];
    assert!(forged["passport"].get("raw").is_none());
    let result = validate_form_data(spec, &Js::from_json(forged), Some("en"), None).expect("runs");
    assert!(result.errors.iter().any(|(key, _)| key == "passport"));
}

fn v_key_order(map: &serde_json::Map<String, Value>) -> Vec<String> {
    map.keys().cloned().collect()
}

#[test]
fn same_jsonlogic() {
    let cases = logic().as_array().expect("jsonlogic array");
    let expected_results = expected()["jsonlogic"]
        .as_array()
        .expect("expected jsonlogic");
    for (index, (case, expected)) in cases.iter().zip(expected_results).enumerate() {
        let logic_js = Js::from_json(&case["logic"]);
        let data_js = Js::from_json(&case["data"]);
        if expected.get("error").is_some() {
            assert!(
                jsonlogic::apply(&logic_js, &data_js).is_err(),
                "jsonlogic #{index}: expected an error"
            );
            continue;
        }
        let result = jsonlogic::apply(&logic_js, &data_js).expect("jsonlogic runs");
        let result = match result {
            Js::Undefined => serde_json::json!({"$undefined": true}),
            other => other.as_json(),
        };
        assert_eq!(result, expected["result"], "jsonlogic #{index}");
    }
}

#[test]
fn same_identifier_checks() {
    let utils = utils();
    let expected_utils = &expected()["utils"];
    let identity: Vec<bool> = utils["identity"]
        .as_array()
        .expect("identity")
        .iter()
        .map(|pair| check_identity(pair[0].as_str().unwrap(), pair[1].as_str().unwrap()))
        .collect();
    assert_eq!(Value::from(identity), expected_utils["identity"]);

    let ibans: Vec<String> = utils["formatIban"]
        .as_array()
        .expect("formatIban")
        .iter()
        .map(|v| format_iban(v.as_str().unwrap()))
        .collect();
    assert_eq!(Value::from(ibans), expected_utils["formatIban"]);

    let plates: Vec<Value> = utils["plates"]
        .as_array()
        .expect("plates")
        .iter()
        .map(|pair| {
            let (f, v) = (pair[0].as_str().unwrap(), pair[1].as_str().unwrap());
            Value::Array(vec![
                Value::from(check_plate(f, v)),
                Value::from(format_plate(f, v)),
            ])
        })
        .collect();
    assert_eq!(Value::Array(plates), expected_utils["plates"]);

    let registries: Vec<Value> = utils["registries"]
        .as_array()
        .expect("registries")
        .iter()
        .map(|pair| {
            let (f, v) = (pair[0].as_str().unwrap(), pair[1].as_str().unwrap());
            Value::Array(vec![
                Value::from(check_company_registry(f, v)),
                Value::from(format_company_registry(f, v)),
            ])
        })
        .collect();
    assert_eq!(Value::Array(registries), expected_utils["registries"]);
}

#[test]
fn same_mrz_reading() {
    let utils = utils();
    let texts = utils["mrz"].as_array().expect("mrz texts");
    let expected_mrz = expected()["utils"]["mrz"].as_array().expect("expected mrz");
    for (text, expected) in texts.iter().zip(expected_mrz) {
        let parsed = parse_mrz(text.as_str().expect("mrz text"), None);
        let result = parsed.map(|p| p.to_dict()).unwrap_or(Value::Null);
        assert_eq!(&result, expected, "mrz {text}");
    }
}
