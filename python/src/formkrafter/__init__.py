"""FormKrafter for Python backends: the spec compiled to the browser's validation schema, and submitted
data validated with it — same error keys, same messages, same verdict as `@streamline-pulse/formkrafter-core`.
"""

from formkrafter.lint import SpecIssue, lint_spec, validation_warnings
from formkrafter.messages import default_validation_message, register_validation_messages
from formkrafter.spec import (
    BrickSpec,
    build_validation_schema,
    default_form_data,
    iterate_bricks,
    iterate_schema_bricks,
    resolve_localized_text,
)
from formkrafter.validate import ErrorDetail, SpecNotSupported, ValidationResult, assert_supported, validate_form_data

__version__ = "0.1.0"
# The core release whose behaviour this version reproduces (python/tests/parity/expected.json).
CORE_VERSION = "0.33.0"

__all__ = [
    "CORE_VERSION",
    "BrickSpec",
    "ErrorDetail",
    "SpecIssue",
    "SpecNotSupported",
    "ValidationResult",
    "assert_supported",
    "build_validation_schema",
    "default_form_data",
    "default_validation_message",
    "iterate_bricks",
    "iterate_schema_bricks",
    "lint_spec",
    "register_validation_messages",
    "resolve_localized_text",
    "validate_form_data",
    "validation_warnings",
]
