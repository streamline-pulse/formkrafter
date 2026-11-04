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
from formkrafter.identity import parse_mrz
from formkrafter.models import BrickSpec
from formkrafter.rules import JavaScriptRule, get_affected_properties
from formkrafter.testing import assert_matches_core, compare_with_core, export_contract

REPO = Path(__file__).resolve().parents[2]
# a workspace that depends on the core, so `@streamline-pulse/formkrafter-core` resolves to packages/core
WEB = REPO / "packages/wc"


TD3 = "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO9001011F3501014ZE184226B<<<<<16"


def text(key: str, **extra: Any) -> dict[str, Any]:
    return {"type": "input", "id": "text", "name": key, "dataType": "string", "configs": {"key": key}, **extra}


def form(*children: dict[str, Any], **extra: Any) -> dict[str, Any]:
    return {"type": "panel", "id": "panel", "name": "Form", "children": list(children), **extra}


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


def hiding(rule_type: str = "jsonLogic", effect_type: str = "boolean", **extra: Any) -> dict[str, Any]:
    effect = {"property": {"target": "hidden", "type": effect_type}, "boolean": True, "code": "return true"}
    return {"name": "r", "type": rule_type, "logic": True, "code": "return true", "effects": [effect], **extra}


@pytest.mark.parametrize(
    "brick",
    [
        text("x", validations=[{"validator": "custom", "customValidator": "return value === 'ok'"}]),
        text("x", rules=[hiding("javaScript")]),
        text("x", rules=[hiding("jsonLogic", "code")]),
        form(text("x"), rules=[hiding("javaScript")]),  # a panel hiding keyed children
    ],
)
def test_javascript_that_decides_the_verdict_is_refused(brick: dict[str, Any]) -> None:
    for spec in (form(brick), form({**ITEMS, "children": [brick]})):  # at the top level and inside rows
        with pytest.raises(SpecNotSupported):
            validate_form_data(spec, {})
        build_validation_schema(spec)  # the schema itself is always available


def test_what_does_not_change_the_verdict_is_accepted() -> None:
    note = {"type": "output", "id": "content", "name": "Note", "configs": {"content": "x"}}
    assert_supported(form({**note, "rules": [hiding("javaScript")]}))  # hides no data
    assert_supported(form(text("x", validations=[{"validator": "custom"}])))  # no code: skipped by the core too
    disable = {**hiding("javaScript"), "effects": [{"property": {"target": "disabled", "type": "code"}, "code": "1"}]}
    assert_supported(form(text("x", rules=[disable])))  # disables, never hides
    assert_supported(form(text("x", rules=[hiding()])))  # JsonLogic runs server-side


def test_rule_scope_feeds_the_rules() -> None:
    btp_age = text("btp_age", validations=[{"validator": "required"}])
    btp_age["rules"] = [{**hiding(), "logic": {"!": {"var": "IS_BTP"}}}]
    spec = form(btp_age)
    assert validate_form_data(spec, {}).errors == {}  # IS_BTP unset: hidden
    assert validate_form_data(spec, {}, rule_scope={"IS_BTP": True}).errors == {"btp_age": "This field is required"}


def test_a_tampered_mrz_verdict_is_not_trusted() -> None:
    spec = form({"type": "input", "id": "mrz", "name": "MRZ", "dataType": "object", "configs": {"key": "mrz"}})
    honest = parse_mrz(TD3)
    assert honest is not None and honest.valid
    assert validate_form_data(spec, {"mrz": honest.to_dict()}).valid
    # the browser trusts `valid`; the server re-reads the zone it was sent
    forged = {**honest.to_dict(), "raw": TD3.replace("9001011", "9001021"), "valid": True}
    assert validate_form_data(spec, {"mrz": forged}).details["mrz"].validator == "mrz"


def test_identifier_errors_name_their_format() -> None:
    spec = form(
        {
            "type": "input",
            "id": "tax-id",
            "name": "IFU",
            "dataType": "string",
            "configs": {"key": "ifu", "idFormat": "bj-ifu"},
        },
        {"type": "input", "id": "iban", "name": "IBAN", "dataType": "string", "configs": {"key": "iban"}},
        {
            "type": "input",
            "id": "company-registry",
            "name": "RCCM",
            "dataType": "string",
            "configs": {"key": "rccm", "registryFormat": "ohada-rccm"},
        },
    )
    details = validate_form_data(spec, {"ifu": "12", "iban": "FR76", "rccm": "x"}, "fr").details
    assert {k: (d.validator, d.value) for k, d in details.items()} == {
        "ifu": ("identity", "bj-ifu"),
        "iban": ("iban", None),
        "rccm": ("registry", "ohada-rccm"),
    }


def test_affected_properties_refuse_javascript_unless_skipped() -> None:
    rules = [hiding("javaScript")]
    with pytest.raises(JavaScriptRule):
        get_affected_properties(rules, {})
    assert get_affected_properties(rules, {}, javascript="skip") == {}
    assert get_affected_properties([hiding()], {}) == {"hidden": True}


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
