"""FormKrafter for Python backends: the spec compiled to the browser's validation schema, and submitted
data validated with it — same error keys, same messages, same verdict as `@streamline-pulse/formkrafter-core`.
"""

from formkrafter import jsonlogic
from formkrafter.identity import (
    IDENTITY_FORMATS,
    PLATE_FORMATS,
    REGISTRY_FORMATS,
    MrzResult,
    check_company_registry,
    check_iban,
    check_identity,
    check_plate,
    format_company_registry,
    format_iban,
    format_plate,
    parse_mrz,
)
from formkrafter.lint import SpecIssue, lint_spec, validation_warnings
from formkrafter.messages import default_validation_message, register_validation_messages
from formkrafter.rules import JavaScriptRule, get_affected_properties, hidden_keys, is_rule_active
from formkrafter.spec import (
    BrickSpec,
    build_validation_schema,
    default_form_data,
    iterate_bricks,
    iterate_schema_bricks,
    resolve_localized_text,
)
from formkrafter.validate import ErrorDetail, SpecNotSupported, ValidationResult, assert_supported, validate_form_data

__version__ = "0.2.0"
# The core release whose behaviour this version reproduces (python/tests/parity/expected.json).
CORE_VERSION = "0.37.0"

__all__ = [
    "CORE_VERSION",
    "IDENTITY_FORMATS",
    "PLATE_FORMATS",
    "REGISTRY_FORMATS",
    "BrickSpec",
    "ErrorDetail",
    "JavaScriptRule",
    "MrzResult",
    "SpecIssue",
    "SpecNotSupported",
    "ValidationResult",
    "assert_supported",
    "build_validation_schema",
    "check_company_registry",
    "check_iban",
    "check_identity",
    "check_plate",
    "default_form_data",
    "default_validation_message",
    "format_company_registry",
    "format_iban",
    "format_plate",
    "get_affected_properties",
    "hidden_keys",
    "is_rule_active",
    "iterate_bricks",
    "iterate_schema_bricks",
    "jsonlogic",
    "lint_spec",
    "parse_mrz",
    "register_validation_messages",
    "resolve_localized_text",
    "validate_form_data",
    "validation_warnings",
]
