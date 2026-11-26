from __future__ import annotations

import math
from typing import Any

import pytest

from formkrafter import SchemaInvalid, get_affected_properties, jsonlogic, validate_form_data
from formkrafter._js import compile_pattern, to_number


def form(*children: dict[str, Any]) -> dict[str, Any]:
    return {"type": "panel", "children": list(children)}


def text_field(key: str, *validations: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "input",
        "id": "text",
        "dataType": "string",
        "configs": {"key": key},
        "validations": list(validations),
    }


def matches(pattern: str, value: str) -> bool:
    return compile_pattern(pattern).search(value) is not None


def test_a_schema_that_does_not_compile_is_refused() -> None:
    spec = form(
        {
            "type": "input",
            "id": "text",
            "dataType": "number",
            "configs": {"key": "n"},
            "validations": [{"validator": "min", "value": "abc"}],
        },
        text_field("email", {"validator": "required"}),
    )
    with pytest.raises(SchemaInvalid):
        validate_form_data(spec, {}, "en")


def test_an_mrz_without_its_zone_is_invalid() -> None:
    spec = form({"type": "input", "id": "mrz", "dataType": "object", "configs": {"key": "doc"}})
    assert list(validate_form_data(spec, {"doc": {"valid": True}}, "en").errors) == ["doc"]


def test_number_parses_prefixed_strings_like_javascript() -> None:
    assert math.isnan(to_number("0x+1"))
    assert math.isnan(to_number("0x1_0"))
    assert math.isnan(to_number("0x"))
    assert to_number("0x1F") == 31
    assert to_number("0b101") == 5


@pytest.mark.parametrize(
    ("pattern", "value", "expected"),
    [
        ("^a.b$", "a\rb", False),
        ("^a.b$", "a b", False),
        ("^a.b$", "aéb", True),
        (r"^\s$", "﻿", True),
        (r"^\s$", "\x85", False),
        (r"^\s$", "\x1c", False),
        (r"^\w+\b", "abcé", True),
        (r"^[\D]+$", "é", True),
        (r"^[\D]+$", "1", False),
        (r"^[\S]+$", "a ", False),
        (r"^[\s\d]+$", "1 2", True),
        (r"^[[a]+$", "[a", True),
        (r"^[a&&b]+$", "a&b", True),
        ("^[]$", "", False),
        ("^[^]$", "\n", True),
        (r"^a\0b$", "a\0b", True),
        (r"^\cJ$", "\n", True),
        (r"^(?<year>[0-9]{4})$", "2026", True),
        ("^a$", "a\n", False),
    ],
)
def test_patterns_follow_javascript_semantics(pattern: str, value: str, expected: bool) -> None:
    assert matches(pattern, value) is expected


def test_jsonlogic_indexes_strings_by_utf16_units() -> None:
    data = {"s": "😀a"}
    assert jsonlogic.apply({"var": "s.2"}, data) == "a"
    assert jsonlogic.apply({"var": "s.length"}, data) == 3


def test_an_effect_without_target_is_keyed_undefined() -> None:
    rules = [{"type": "jsonLogic", "logic": True, "effects": [{"property": {"type": "boolean"}, "boolean": True}]}]
    assert "undefined" in get_affected_properties(rules, {})
