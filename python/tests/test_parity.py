"""The port against the core: every case of parity/cases.json, compiled and validated by both.

parity/expected.json is written by the core (`bun scripts/python-parity.ts`); CI regenerates it and fails
when it is stale, so a core change the port does not follow shows up here.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from formkrafter import CORE_VERSION, build_validation_schema, lint_spec, validate_form_data
from formkrafter.testing import as_json, without_compile_reason

PARITY = Path(__file__).parent / "parity"
CASES = {case["name"]: case for case in json.loads((PARITY / "cases.json").read_text())}
EXPECTED = json.loads((PARITY / "expected.json").read_text())
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
        result = validate_form_data(CASES[name]["spec"], sample, expected["locale"]).to_dict()
        assert without_compile_reason(result) == without_compile_reason(verdict), (
            f"data: {json.dumps(sample, ensure_ascii=False)}"
        )
        # first error per field: the keys come out in the core's order too
        assert list(result["errors"]) == list(verdict["errors"])
