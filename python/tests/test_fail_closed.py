"""A schema that does not compile refuses the data, and `pattern` validations run in linear time."""

from __future__ import annotations

import random
import time
from typing import Any

import pytest

from formkrafter import SchemaInvalid, validate_form_data
from formkrafter._js import compile_pattern
from formkrafter._linear import MAX_PATTERN_PROGRAM, LinearPattern, UnsupportedPattern
from formkrafter.validate import assert_schema_compiles

REQUIRED = {"validator": "required"}


def root(*children: dict[str, Any]) -> dict[str, Any]:
    return {"type": "panel", "id": "root", "name": "Root", "configs": {"key": "root"}, "children": list(children)}


def text(key: str, *validations: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "input",
        "dataType": "string",
        "id": "text",
        "name": key,
        "configs": {"key": key},
        "validations": list(validations),
    }


def collection(*rows: dict[str, Any]) -> dict[str, Any]:
    return root(
        {
            "type": "collection",
            "id": "collection",
            "name": "Items",
            "dataType": "array",
            "configs": {"key": "items"},
            "children": list(rows),
        }
    )


BROKEN_ROW = collection(text("x", REQUIRED, {"validator": "pattern", "value": "("}))


@pytest.mark.parametrize(
    "spec",
    [
        root(text("a", REQUIRED, {"validator": "pattern", "value": "([a-z"})),
        root(text("a", REQUIRED, {"validator": "minLength", "value": "abc"})),
        root(
            text("a", REQUIRED),
            {
                "type": "input",
                "dataType": "string",
                "id": "national-id",
                "name": "Id",
                "configs": {"key": "id", "idFormat": "xx-yy"},
            },
        ),
        root(text("a", REQUIRED, {"validator": "pattern", "value": "^(a)\\1$"})),
        root(text("a", REQUIRED, {"validator": "pattern", "value": "(?<=x)a"})),
        root(text("a", {"validator": "pattern", "value": "(a{100}){200}"})),
    ],
    ids=["pattern", "min-length", "id-format", "backreference", "lookbehind", "too-large"],
)
def test_a_schema_that_does_not_compile_is_refused(spec: dict[str, Any]) -> None:
    with pytest.raises(SchemaInvalid, match="so the data was refused"):
        validate_form_data(spec, {"a": "a"})
    with pytest.raises(SchemaInvalid):
        assert_schema_compiles(spec)


@pytest.mark.parametrize("data", [{"items": [{}]}, {"items": []}, {}])
def test_a_broken_row_template_is_refused_with_or_without_rows(data: dict[str, Any]) -> None:
    with pytest.raises(SchemaInvalid, match="Invalid regular expression"):
        validate_form_data(BROKEN_ROW, data)


def test_a_healthy_spec_still_validates() -> None:
    spec = collection(text("x", REQUIRED, {"validator": "pattern", "value": "^[a-z]+$"}))
    assert_schema_compiles(spec)
    assert validate_form_data(spec, {"items": [{"x": "abc"}]}).valid
    assert validate_form_data(spec, {"items": [{"x": "ABC"}]}).errors == {"items[0].x": "Invalid format"}


@pytest.mark.parametrize("length", [26, 40, 20_000])
def test_a_crafted_value_against_a_naive_pattern_answers_at_once(length: int) -> None:
    # `re` takes seconds at 26 characters, doubling with each one more
    spec = root(text("name", {"validator": "pattern", "value": "^([a-zA-Z]+\\s?)*$"}))
    started = time.perf_counter()
    result = validate_form_data(spec, {"name": "a" * length + "!"})
    assert time.perf_counter() - started < 2
    assert list(result.errors) == ["name"]


def test_lookahead_named_groups_and_unicode_classes_keep_their_meaning() -> None:
    password = root(text("p", {"validator": "pattern", "value": "^(?=.*\\d)(?=.*[a-z]).{8,}$"}))
    assert validate_form_data(password, {"p": "abcdefg1"}).valid
    assert not validate_form_data(password, {"p": "abcdefgh"}).valid
    code = root(text("c", {"validator": "pattern", "value": "^(?<area>[A-Z]{2})-\\d+$"}))
    assert validate_form_data(code, {"c": "AB-12"}).valid
    assert not validate_form_data(code, {"c": "ab-12"}).valid


def test_the_pattern_size_is_bounded() -> None:
    with pytest.raises(UnsupportedPattern, match="pattern too large"):
        LinearPattern(f"(?:a{{{MAX_PATTERN_PROGRAM}}})", compile_pattern)


def test_the_linear_engine_agrees_with_the_backtracking_one() -> None:
    atoms = [
        "a",
        "b",
        "(a|b)",
        "(a*)",
        "[ab]",
        "a?",
        "(?:ab)+",
        "b{1,2}",
        "(?=a)",
        "(?!b)",
        "^",
        "$",
        "\\b",
        ".",
        "(a|)",
    ]
    rng = random.Random(7)
    checked = 0
    for _ in range(2000):
        pattern = ""
        for _ in range(rng.randint(1, 5)):
            pattern += rng.choice(atoms)
            if rng.random() < 0.3:
                pattern = f"({pattern}){rng.choice(['*', '+', '?', '{0,2}', '{2,}', '|'])}"
        try:
            reference = compile_pattern(pattern)
        except Exception:
            continue
        linear = LinearPattern(pattern, compile_pattern)
        for _ in range(8):
            value = "".join(rng.choice("ab ") for _ in range(rng.randint(0, 5)))
            assert linear.search(value) == (reference.search(value) is not None), (pattern, value)
            checked += 1
    assert checked > 5000
