"""The port against the core: every case of parity/cases.json compiled and validated by both, every rule
of parity/jsonlogic.json evaluated by both, and the identifier helpers of parity/utils.json.

parity/expected.json is written by the core (`bun scripts/python-parity.ts`); CI regenerates it and fails
when it is stale, so a core change the port does not follow shows up here.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from formkrafter import CORE_VERSION, build_validation_schema, jsonlogic, lint_spec, validate_form_data
from formkrafter._js import UNDEFINED
from formkrafter.identity import (
    check_company_registry,
    check_identity,
    check_plate,
    format_company_registry,
    format_iban,
    format_plate,
    parse_mrz,
)
from formkrafter.testing import as_json, without_compile_reason

PARITY = Path(__file__).parent / "parity"
CASES = {case["name"]: case for case in json.loads((PARITY / "cases.json").read_text())}
EXPECTED = json.loads((PARITY / "expected.json").read_text())
LOGIC = json.loads((PARITY / "jsonlogic.json").read_text())
UTILS = json.loads((PARITY / "utils.json").read_text())
PARAMS = [
    pytest.param(case["name"], index, id=f"{case['name']}-{locale['locale']}")
    for case in EXPECTED["cases"]
    for index, locale in enumerate(case["locales"])
]


def test_fixtures_come_from_the_core_this_version_follows() -> None:
    assert EXPECTED["core"] == CORE_VERSION


@pytest.mark.parametrize(("name", "index"), PARAMS)
def test_same_schema(name: str, index: int) -> None:
    expected = next(c for c in EXPECTED["cases"] if c["name"] == name)["locales"][index]
    assert as_json(build_validation_schema(CASES[name]["spec"], expected["locale"])) == expected["schema"]


@pytest.mark.parametrize("name", list(CASES))
def test_same_lint(name: str) -> None:
    expected = next(c for c in EXPECTED["cases"] if c["name"] == name)["lint"]
    assert [issue.to_dict() for issue in lint_spec(CASES[name]["spec"])] == expected


@pytest.mark.parametrize(("name", "index"), PARAMS)
def test_same_verdict(name: str, index: int) -> None:
    expected = next(c for c in EXPECTED["cases"] if c["name"] == name)["locales"][index]
    for sample, verdict in zip(CASES[name]["data"], expected["results"], strict=True):
        if "error" in verdict:  # the core throws (a rule with an unknown operation): so does the port
            with pytest.raises(jsonlogic.JsonLogicError, match=verdict["error"]):
                validate_form_data(CASES[name]["spec"], sample, expected["locale"])
            continue
        result = validate_form_data(CASES[name]["spec"], sample, expected["locale"]).to_dict()
        assert without_compile_reason(result) == without_compile_reason(verdict), (
            f"data: {json.dumps(sample, ensure_ascii=False)}"
        )
        # first error per field: the keys come out in the core's order too
        assert list(result["errors"]) == list(verdict["errors"])


def _logic_result(value: object) -> object:
    return {"$undefined": True} if value is UNDEFINED else as_json(value)


@pytest.mark.parametrize("index", range(len(LOGIC)), ids=lambda i: json.dumps(LOGIC[i]["logic"])[:60])
def test_same_jsonlogic(index: int) -> None:
    case, expected = LOGIC[index], EXPECTED["jsonlogic"][index]
    if "error" in expected:
        with pytest.raises(jsonlogic.JsonLogicError):
            jsonlogic.apply(case["logic"], case["data"])
        return
    assert _logic_result(jsonlogic.apply(case["logic"], case["data"])) == expected["result"]


def test_same_identifier_checks() -> None:
    expected = EXPECTED["utils"]
    assert [check_identity(f, v) for f, v in UTILS["identity"]] == expected["identity"]
    assert [format_iban(v) for v in UTILS["formatIban"]] == expected["formatIban"]
    assert [[check_plate(f, v), format_plate(f, v)] for f, v in UTILS["plates"]] == expected["plates"]
    registries = [[check_company_registry(f, v), format_company_registry(f, v)] for f, v in UTILS["registries"]]
    assert registries == expected["registries"]


def test_same_mrz_reading() -> None:
    for text, expected in zip(UTILS["mrz"], EXPECTED["utils"]["mrz"], strict=True):
        parsed = parse_mrz(text)
        assert (parsed.to_dict() if parsed else None) == expected, repr(text)
