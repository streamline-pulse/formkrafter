//! Server-side FormKrafter: validation, spec linting, rules and identifier checks, with parity
//! against the TypeScript core (the fixtures in `python/tests/parity` are the contract).

pub mod identity;
pub mod js;
pub mod jsonlogic;
pub mod lint;
pub mod messages;
pub mod rules;
pub mod spec;
pub mod validate;

/// The core version these fixtures were generated from.
pub const CORE_VERSION: &str = "0.38.1";

pub use lint::{lint_spec, validation_warnings, SpecIssue};
pub use messages::{default_validation_message, register_validation_messages};
pub use rules::{get_affected_properties, hidden_keys, JavaScriptMode, JavaScriptRule};
pub use spec::{
    as_spec, build_validation_schema, configs_of, default_form_data, iterate_bricks,
    iterate_schema_bricks, resolve_localized_text,
};
pub use validate::{
    assert_supported, validate_form_data, ErrorDetail, SpecNotSupported, ValidateError,
    ValidationResult,
};
