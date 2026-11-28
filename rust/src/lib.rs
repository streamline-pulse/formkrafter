//! Server-side FormKrafter: validation, spec linting, rules and identifier checks, with parity
//! against the TypeScript core (the fixtures in `parity/` are the contract).

pub mod identity;
pub mod js;
pub mod jsonlogic;
pub mod lint;
pub mod messages;
pub mod rules;
pub mod spec;
pub mod validate;

/// The core version these fixtures were generated from.
pub const CORE_VERSION: &str = "0.38.3";

pub use identity::{
    check_company_registry, check_iban, check_identity, check_plate, format_company_registry,
    format_iban, format_plate, parse_mrz, MrzResult, RegistryFormat, IDENTITY_FORMATS,
    PLATE_FORMATS, REGISTRY_FORMATS,
};
pub use lint::{lint_spec, validation_warnings, SpecIssue};
pub use messages::{default_validation_message, register_validation_messages};
pub use rules::{
    get_affected_properties, hidden_keys, is_rule_active, JavaScriptMode, JavaScriptRule, RuleError,
};
pub use spec::{
    as_spec, build_validation_schema, configs_of, default_form_data, iterate_bricks,
    iterate_schema_bricks, resolve_localized_text,
};
pub use validate::{
    assert_schema_compiles, assert_supported, validate_form_data, ErrorDetail, SpecNotSupported,
    ValidateError, ValidationResult,
};
