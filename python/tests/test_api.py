"""What the parity fixtures do not cover: refusals, error details, messages, models and the test helpers."""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any

import pytest

from formkrafter import (
    SpecNotSupported,
    assert_supported,
    build_validation_schema,
    default_form_data,
    default_validation_message,
    register_validation_messages,
    validate_form_data,
)
from formkrafter.models import BrickSpec
from formkrafter.testing import assert_matches_core, compare_with_core, export_contract

REPO = Path(__file__).resolve().parents[2]
# a workspace that depends on the core, so `@streamline-pulse/formkrafter-core` resolves to packages/core
WEB = REPO / "packages/wc"


def text(key: str, **extra: Any) -> dict[str, Any]:
    return {"type": "input", "id": "text", "name": key, "dataType": "string", "configs": {"key": key}, **extra}


def form(*children: dict[str, Any]) -> dict[str, Any]:
    return {"type": "panel", "id": "panel", "name": "Form", "children": list(children)}


ITEMS = {
    "type": "collection",
    "id": "data-grid",
    "name": "Items",
    "dataType": "array",
    "configs": {"key": "items"},
    "children": [
        {
            "type": "input",
            "id": "number",
            "name": "Value",
            "dataType": "number",
            "configs": {"key": "declared_value"},
            "validations": [{"validator": "required"}, {"validator": "min", "value": 0}],
        }
    ],
}


def test_details_carry_the_validator_and_its_value() -> None:
    spec = form(
        text("origin", validations=[{"validator": "required"}, {"validator": "pattern", "value": "^[A-Z]{2}$"}]), ITEMS
    )
    result = validate_form_data(spec, {"items": [{"declared_value": -1}, {}]}, "fr")
    assert {k: d.to_dict() for k, d in result.details.items()} == {
        "origin": {"validator": "required", "value": None, "message": "Ce champ est obligatoire"},
        "items[0].declared_value": {"validator": "min", "value": 0, "message": "Minimum 0"},
        "items[1].declared_value": {"validator": "required", "value": None, "message": "Ce champ est obligatoire"},
    }
    assert validate_form_data(spec, {"origin": "c", "items": []}).details["origin"].to_dict() == {
        "validator": "pattern",
        "value": "^[A-Z]{2}$",
        "message": "Invalid format",
    }


@pytest.mark.parametrize(
    "brick",
    [
        text("x", validations=[{"validator": "custom", "customValidator": "return value === 'ok'"}]),
        text(
            "x",
            rules=[
                {
                    "name": "r",
                    "type": "jsonLogic",
                    "logic": True,
                    "effects": [{"property": {"target": "hidden", "type": "boolean"}, "boolean": True}],
                }
            ],
        ),
        {"type": "input", "id": "iban", "name": "IBAN", "dataType": "string", "configs": {"key": "x"}},
        {
            "type": "input",
            "id": "tax-id",
            "name": "NIF",
            "dataType": "string",
            "configs": {"key": "x", "idFormat": "bj-ifu"},
        },
        {"type": "input", "id": "company-registry", "name": "RCCM", "dataType": "string", "configs": {"key": "x"}},
        {"type": "input", "id": "mrz", "name": "MRZ", "dataType": "object", "configs": {"key": "x"}},
    ],
)
def test_specs_beyond_the_port_are_refused(brick: dict[str, Any]) -> None:
    for spec in (form(brick), form({**ITEMS, "children": [brick]})):  # at the top level and inside rows
        with pytest.raises(SpecNotSupported):
            validate_form_data(spec, {})
        build_validation_schema(spec)  # the schema itself is always available


def test_what_does_not_change_the_verdict_is_accepted() -> None:
    hide_note = {
        "name": "r",
        "type": "jsonLogic",
        "logic": True,
        "effects": [{"property": {"target": "hidden", "type": "boolean"}, "boolean": True}],
    }
    assert_supported(
        form({"type": "output", "id": "content", "name": "Note", "configs": {"content": "x"}, "rules": [hide_note]})
    )
    assert_supported(form(text("x", validations=[{"validator": "custom"}])))  # no code: skipped by the core too
    assert_supported(
        form({"type": "input", "id": "tax-id", "name": "NIF", "dataType": "string", "configs": {"key": "x"}})
    )


def test_registered_messages_override_the_defaults() -> None:
    register_validation_messages("ee", {"required": "Nõutud väli", "min": "Vähemalt {value}"})
    assert default_validation_message("required", "ee") == "Nõutud väli"
    assert default_validation_message("max", "ee", 3) == "Must be at most 3"  # missing in the pack: English
    assert validate_form_data(form(ITEMS), {"items": [{"declared_value": -2}]}, "ee").errors == {
        "items[0].declared_value": "Vähemalt 0"
    }


def test_pydantic_models_and_dicts_are_interchangeable() -> None:
    spec = form(
        text(
            "name", validations=[{"validator": "minLength", "value": 2}], configs={"key": "name", "defaultValue": "Ada"}
        ),
        ITEMS,
    )
    model = BrickSpec.model_validate(spec)
    assert model.to_spec() == spec
    assert build_validation_schema(model, "fr") == build_validation_schema(spec, "fr")
    assert validate_form_data(model, {"name": "A"}).errors == {"name": "Must be at least 2 characters"}
    assert default_form_data(model) == {"name": "Ada"}


def test_export_contract_holds_one_schema_per_locale() -> None:
    contract = export_contract(form(ITEMS), ["fr", "en"])
    assert set(contract["schemas"]) == {"fr", "en"}
    assert contract["schemas"]["fr"]["properties"]["items"]["errorMessage"]["type"] == "Valeur invalide"


@pytest.mark.skipif(
    shutil.which("node") is None
    or not (WEB / "node_modules/@streamline-pulse/formkrafter-core/dist/index.js").exists(),
    reason="needs node and a built core",
)
def test_assert_matches_core_runs_the_real_core() -> None:
    spec = form(text("origin", validations=[{"validator": "required"}]), ITEMS)
    assert_matches_core(
        spec, samples=[{}, {"origin": "CI", "items": [{"declared_value": -1}]}], locales=["fr", "en"], node_project=WEB
    )

    register_validation_messages("fr", {"min": "Au moins {value}"})  # the browser does not know this message
    try:
        differences = compare_with_core(spec, samples=[{"items": [{"declared_value": -1}]}], node_project=WEB)
    finally:
        register_validation_messages("fr", {"min": "Minimum {value}"})
    # `min` sits in a row: the top-level schema agrees, the row's verdict does not
    assert len(differences) == 1 and differences[0].startswith("verdict [fr]")
