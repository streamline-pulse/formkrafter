"""Form data validation — `validators/validator.ts` in the core, with Ajv replaced by the handful of keywords
`build_validation_schema` emits, evaluated the way Ajv and ajv-errors report them.

Same spec, same data: same error keys (`items[0].hs_code`), same messages, same warnings as the browser.
"""

from __future__ import annotations

import math
from collections.abc import Callable, Iterator, Mapping
from dataclasses import dataclass, field
from typing import Any

from formkrafter._js import FORMATS, compile_pattern, to_number
from formkrafter.lint import validation_warnings
from formkrafter.spec import (
    BrickSpec,
    as_spec,
    build_validation_schema,
    configs_of,
    iterate_bricks,
    iterate_schema_bricks,
)


class SpecNotSupported(ValueError):
    """The spec relies on something the Python port does not check: refused rather than half validated."""


@dataclass(frozen=True)
class ErrorDetail:
    """One error with its validator, so an API can return a stable code and let the client word it."""

    validator: str
    message: str
    value: Any = None

    def to_dict(self) -> dict[str, Any]:
        return {"validator": self.validator, "value": self.value, "message": self.message}


@dataclass(frozen=True)
class ValidationResult:
    valid: bool
    errors: dict[str, str]
    details: dict[str, ErrorDetail] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """The result as the core's `validateFormData` returns it."""
        out: dict[str, Any] = {"valid": self.valid, "errors": dict(self.errors)}
        if self.warnings:
            out["warnings"] = list(self.warnings)
        return out


# JSON Schema keyword -> FormKrafter validator, for `ErrorDetail.validator`
_VALIDATOR_OF = {
    "type": "type",
    "minLength": "minLength",
    "maxLength": "maxLength",
    "minimum": "min",
    "maximum": "max",
    "pattern": "pattern",
    "minItems": "minItems",
    "maxItems": "maxItems",
    "dateRange": "dateRange",
}
_FORMAT_VALIDATOR = {"email": "email", "uri": "url"}
_COUNTS = ("minLength", "maxLength", "minItems", "maxItems")


def _is_number(value: Any) -> bool:
    return isinstance(value, int | float) and not isinstance(value, bool)


_TYPE_CHECKS: dict[str, Callable[[Any], bool]] = {
    "string": lambda v: isinstance(v, str),
    "number": _is_number,
    "integer": lambda v: _is_number(v) and math.isfinite(v) and float(v).is_integer(),
    "boolean": lambda v: isinstance(v, bool),
    "object": lambda v: isinstance(v, Mapping),
    "array": lambda v: isinstance(v, list),
    "null": lambda v: v is None,
}


def _js_le(a: Any, b: Any) -> bool:
    if isinstance(a, str) and isinstance(b, str):
        return a.encode("utf-16-be") <= b.encode("utf-16-be")
    try:
        return to_number(a) <= to_number(b)
    except TypeError:
        return False


def _failing_keywords(prop: Mapping[str, Any], value: Any, patterns: Mapping[str, Any]) -> Iterator[str]:
    """The keywords of a property schema that the value fails, each applied to the types Ajv applies it to."""
    types = prop.get("type")
    allowed = types if isinstance(types, list) else [types]
    if not (prop.get("nullable") and value is None) and not any(
        _TYPE_CHECKS.get(str(t), lambda _: False)(value) for t in allowed
    ):
        yield "type"
    if isinstance(value, str):
        if "minLength" in prop and len(value) < prop["minLength"]:
            yield "minLength"
        if "maxLength" in prop and len(value) > prop["maxLength"]:
            yield "maxLength"
        if "pattern" in prop and not patterns[prop["pattern"]].search(value):
            yield "pattern"
        if "format" in prop and not FORMATS[prop["format"]](value):
            yield "format"
    if _is_number(value):
        if "minimum" in prop and value < prop["minimum"]:
            yield "minimum"
        if "maximum" in prop and value > prop["maximum"]:
            yield "maximum"
    if isinstance(value, list):
        if "minItems" in prop and len(value) < prop["minItems"]:
            yield "minItems"
        if "maxItems" in prop and len(value) > prop["maxItems"]:
            yield "maxItems"
    if prop.get("dateRange") and isinstance(value, Mapping):
        start, end = value.get("from"), value.get("to")
        if start and end and not _js_le(start, end):
            yield "dateRange"


def _compile(schema: Mapping[str, Any]) -> dict[str, Any]:
    """The checks Ajv runs when it compiles the schema (meta-schema, regular expressions); raises on failure."""
    patterns: dict[str, Any] = {}
    for key, prop in schema["properties"].items():
        for keyword in _COUNTS:
            if keyword in prop:
                n = prop[keyword]
                if not _is_number(n) or not math.isfinite(n) or n < 0 or not float(n).is_integer():
                    raise ValueError(f"schema is invalid: data/properties/{key}/{keyword} must be integer >= 0")
        for keyword in ("minimum", "maximum"):
            if keyword in prop and (not _is_number(prop[keyword]) or not math.isfinite(prop[keyword])):
                raise ValueError(f"schema is invalid: data/properties/{key}/{keyword} must be number")
        if "pattern" in prop and prop["pattern"] not in patterns:
            try:
                patterns[prop["pattern"]] = compile_pattern(prop["pattern"])
            except Exception as error:  # re.error, or regex.error with the optional module
                raise ValueError(f"Invalid regular expression: /{prop['pattern']}/: {error}") from error
    return patterns


def _detail(keyword: str, prop: Mapping[str, Any], message: str) -> ErrorDetail:
    if keyword == "format":
        return ErrorDetail(_FORMAT_VALIDATOR.get(prop["format"], "format"), message)
    if keyword == "type":
        return ErrorDetail("type", message, prop.get("type"))
    if keyword == "dateRange":
        return ErrorDetail(_VALIDATOR_OF[keyword], message)
    return ErrorDetail(_VALIDATOR_OF[keyword], message, prop.get(keyword))


def _strip_empty(data: Any) -> dict[str, Any]:
    if not isinstance(data, Mapping):
        return {}
    return {k: v for k, v in data.items() if v != "" and v is not None}


def _row_spec(collection: BrickSpec) -> BrickSpec:
    return {
        "type": "panel",
        "id": "collection-row",
        "name": "Row",
        "configs": {"key": f"{configs_of(collection).get('key') or 'collection'}_row"},
        "children": collection.get("children") or [],
    }


def _levels(spec: BrickSpec) -> Iterator[BrickSpec]:
    """The spec and the row template of every collection under it, at any depth."""
    yield spec
    for brick in iterate_schema_bricks(spec):
        if brick.get("type") == "collection":
            yield from _levels(_row_spec(brick))


def _has_key(brick: BrickSpec) -> bool:
    return any(configs_of(b).get("key") for b, _ in iterate_bricks(brick))


def assert_supported(spec: Any) -> None:
    """Raise `SpecNotSupported` when validating the spec needs what the port does not run.

    Refused: JavaScript custom validators, rules that hide data-carrying bricks (their errors depend on the
    rules), and the bricks whose check is not ported yet (identity numbers, plates, registries, MRZ).
    Rules that only disable, prefill or require do not change validation and are accepted.
    """
    spec = as_spec(spec)
    if not spec:
        return
    for brick, path in iterate_bricks(spec):
        for validation in brick.get("validations") or []:
            if (
                isinstance(validation, Mapping)
                and validation.get("validator") == "custom"
                and validation.get("customValidator")
            ):
                raise SpecNotSupported(
                    f"{path} ({brick.get('name')}): JavaScript custom validators do not run server-side"
                )
        hides = any(
            ((effect or {}).get("property") or {}).get("target") == "hidden"
            for rule in brick.get("rules") or []
            for effect in (rule or {}).get("effects") or []
        )
        if hides and _has_key(brick):
            raise SpecNotSupported(
                f"{path} ({brick.get('name')}): rules that hide fields are not evaluated server-side yet"
            )
    for level in _levels(spec):
        schema = build_validation_schema(level) or {"properties": {}}
        for key, prop in schema["properties"].items():
            if "format" in prop and prop["format"] not in FORMATS:
                raise SpecNotSupported(f'"{key}": the {prop["format"]} check is not ported to Python yet')
            if "mrzValid" in prop:
                raise SpecNotSupported(f'"{key}": the MRZ check is not ported to Python yet')


def _validate_level(
    spec: BrickSpec, data: dict[str, Any], locale: str | None
) -> tuple[dict[str, ErrorDetail], str | None]:
    schema = build_validation_schema(spec, locale)
    if not schema:
        return {}, None
    try:
        patterns = _compile(schema)
    except ValueError as error:
        return {}, f"the validation schema failed to compile, so no rule was enforced: {error}"

    details: dict[str, ErrorDetail] = {}
    for key, prop in schema["properties"].items():
        if key not in data:
            continue
        failing = set(_failing_keywords(prop, data[key], patterns))
        # ajv-errors reports in the order of `errorMessage`; an empty message is dropped like the core does
        for keyword, message in prop["errorMessage"].items():
            if keyword in failing and message:
                details[key] = _detail(keyword, prop, message)
                break
    required_messages = schema.get("errorMessage", {}).get("required", {})
    for key in schema["required"]:
        message = required_messages.get(key)
        if key not in data and key not in details and message:
            details[key] = ErrorDetail("required", message)
    return details, None


def validate_form_data(spec: Any, data: Any, locale: str | None = None) -> ValidationResult:
    """Validate submitted data against a spec, as `validateFormData` does in the browser.

    Empty strings and nulls count as missing; collections are validated row by row, their errors keyed
    `items[0].field`. Raises `SpecNotSupported` when the spec needs what the port does not run.
    """
    spec = as_spec(spec)
    assert_supported(spec)
    return _validate(spec, data, locale)


def _validate(spec: BrickSpec | None, data: Any, locale: str | None) -> ValidationResult:
    if not spec:
        return ValidationResult(True, {})
    present = _strip_empty(data)
    details, compile_failure = _validate_level(spec, present, locale)

    for brick in iterate_schema_bricks(spec):
        key: Any = configs_of(brick).get("key")
        if brick.get("type") != "collection" or not key or not isinstance(present.get(key), list):
            continue
        row_spec = _row_spec(brick)
        for index, row in enumerate(present[key]):
            for field_key, detail in _validate(row_spec, row, locale).details.items():
                details.setdefault(f"{key}[{index}].{field_key}", detail)

    warnings = validation_warnings(spec)
    if compile_failure:
        warnings.append(compile_failure)
    errors = {key: detail.message for key, detail in details.items()}
    return ValidationResult(not errors, errors, details, warnings)
