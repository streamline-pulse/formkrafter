"""Specs: walking the brick tree, localized text and the validation schema — `utils/brick-spec.ts` in the core."""

from __future__ import annotations

from collections.abc import Iterator, Mapping
from typing import Any

from formkrafter._js import to_number
from formkrafter.messages import default_validation_message

BrickSpec = Mapping[str, Any]


def as_spec(spec: Any) -> BrickSpec | None:
    """A spec as a plain mapping: dicts pass through, Pydantic models (`formkrafter.models`) are dumped."""
    if spec is None or isinstance(spec, Mapping):
        return spec
    dump = getattr(spec, "model_dump", None)
    if dump is None:
        raise TypeError(f"expected a brick spec (mapping or Pydantic model), got {type(spec).__name__}")
    dumped: BrickSpec = dump(by_alias=True, exclude_none=True)
    return dumped


def truthy(value: Any) -> bool:
    """JavaScript truthiness: an empty list or object is true, "" and 0 are false."""
    if isinstance(value, list | dict):
        return True
    return bool(value)


def configs_of(brick: BrickSpec) -> Mapping[str, Any]:
    configs = brick.get("configs")
    return configs if isinstance(configs, Mapping) else {}


def iterate_bricks(spec: Any, path: str = "0") -> Iterator[tuple[BrickSpec, str]]:
    """Every brick of the tree with its path ("0.1.2"), collections included (`iterateBricks`)."""
    spec = as_spec(spec)
    if not spec:
        return
    yield spec, path
    for index, child in enumerate(spec.get("children") or []):
        yield from iterate_bricks(child, f"{path}.{index}")


def iterate_schema_bricks(spec: Any) -> Iterator[BrickSpec]:
    """The bricks whose data sits at this level: a collection is yielded, its rows are not (`iterateSchemaBricks`)."""
    spec = as_spec(spec)
    if not spec:
        return
    yield spec
    if spec.get("type") == "collection":
        return
    for child in spec.get("children") or []:
        yield from iterate_schema_bricks(child)


def is_localized_object(value: Any) -> bool:
    return isinstance(value, Mapping) and len(value) > 0 and all(isinstance(entry, str) for entry in value.values())


def resolve_localized_text(value: Any, locale: str | None = None) -> Any:
    """`{"fr": "…", "en": "…"}` in the locale, else its first entry; any other value as is."""
    if not is_localized_object(value):
        return value
    if locale and locale in value:
        return value[locale]
    return next(iter(value.values()))


def default_form_data(spec: Any) -> dict[str, Any]:
    """The `defaultValue` of every keyed brick at this level, first brick wins (`defaultFormData`)."""
    defaults: dict[str, Any] = {}
    for brick in iterate_schema_bricks(spec):
        configs = configs_of(brick)
        key: Any = configs.get("key")
        value = configs.get("defaultValue", _MISSING)
        if truthy(key) and value is not _MISSING and key not in defaults:
            defaults[key] = value
    return defaults


_MISSING = object()

# validator -> JSON Schema keyword, for those that take a number
_NUMERIC = {
    "minLength": "minLength",
    "maxLength": "maxLength",
    "min": "minimum",
    "max": "maximum",
    "minItems": "minItems",
    "maxItems": "maxItems",
}


def build_validation_schema(spec: Any, locale: str | None = None) -> dict[str, Any] | None:
    """The Ajv schema of the spec's top level, exactly as `buildValidationSchema` builds it.

    It holds `nullable` and ajv-errors `errorMessage` keywords; collections are a single `array` property,
    their rows being validated one by one by `validate_form_data`.
    """
    spec = as_spec(spec)
    if not spec:
        return None

    properties: dict[str, Any] = {}
    required: list[str] = []
    required_messages: dict[str, str] = {}

    def message_of(raw: Any) -> str | None:
        resolved = resolve_localized_text(raw, locale)
        return resolved if isinstance(resolved, str) else None

    def message_or_default(raw: Any, validator: str, value: Any = None) -> str:
        message = message_of(raw)
        return default_validation_message(validator, locale, value) if message is None else message

    for brick in iterate_schema_bricks(spec):
        configs = configs_of(brick)
        key: Any = configs.get("key")
        data_type = (
            "array" if configs.get("multiple") is True and brick.get("dataType") == "object" else brick.get("dataType")
        )
        if not truthy(key) or not truthy(data_type) or data_type == "void":
            continue

        validations = [v for v in brick.get("validations") or [] if isinstance(v, Mapping)]
        is_required = next((v for v in validations if v.get("validator") == "required"), None)

        prop: dict[str, Any] = {"type": data_type, "nullable": is_required is None}
        messages: dict[str, str] = {"type": default_validation_message("type", locale)}

        for validation in validations:
            validator, value = validation.get("validator"), validation.get("value")
            message = message_or_default(validation.get("message"), str(validator), value)
            if validator in _NUMERIC and value is not None:
                keyword = _NUMERIC[validator]
                prop[keyword] = to_number(value)
                messages[keyword] = message
            elif validator == "pattern" and isinstance(value, str) and value:
                prop["pattern"] = value
                messages["pattern"] = message
            elif validator == "email":
                prop["format"] = "email"
                messages["format"] = message
            elif validator == "url":
                prop["format"] = "uri"
                messages["format"] = message

        # Identity bricks: the rule comes from the brick, not from a validation to tick.
        brick_id = brick.get("id")
        if brick_id == "iban":
            prop["format"] = "identity-iban"
            messages["format"] = default_validation_message("iban", locale)
        id_format = configs.get("idFormat")
        if brick_id in ("national-id", "tax-id") and isinstance(id_format, str) and id_format:
            prop["format"] = f"identity-{id_format}"
            messages["format"] = default_validation_message("identity", locale)
        if brick_id == "date-range":
            prop["dateRange"] = True
            messages["dateRange"] = default_validation_message("dateRange", locale)
        if brick_id == "vehicle-plate":
            plate = configs.get("plateFormat")
            prop["format"] = f"plate-{plate if isinstance(plate, str) and plate else 'generic'}"
            messages["format"] = default_validation_message("plate", locale)
        if brick_id == "company-registry":
            registry = configs.get("registryFormat")
            prop["format"] = f"registry-{registry if isinstance(registry, str) and registry else 'generic'}"
            messages["format"] = default_validation_message("registry", locale)
        if brick_id == "mrz":
            prop["mrzValid"] = True
            messages["mrzValid"] = default_validation_message("mrz", locale)

        prop["errorMessage"] = messages
        properties[key] = prop

        if is_required is not None:
            required.append(key)
            required_messages[key] = message_or_default(is_required.get("message"), "required")

    schema: dict[str, Any] = {"type": "object", "properties": properties, "required": required}
    if required_messages:
        schema["errorMessage"] = {"required": required_messages}
    schema["additionalProperties"] = False
    return schema
