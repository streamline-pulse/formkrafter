"""Brick rules — `getAffectedProperties` in `brick/utils.ts`: which rules are active on the data, and what
their effects set (`hidden`, `disabled`, `required`, `value`).

JsonLogic rules and effects are evaluated as in the browser. JavaScript rules and `code` effects run in the
browser's sandbox only: they raise `JavaScriptRule`, unless `javascript="skip"` treats them as inactive.
"""

from __future__ import annotations

from collections.abc import Iterator, Mapping, Sequence
from typing import Any, Literal

from formkrafter import jsonlogic
from formkrafter._js import UNDEFINED
from formkrafter.spec import BrickSpec, as_spec, configs_of

JavaScriptMode = Literal["raise", "skip"]


class JavaScriptRule(ValueError):
    """A rule or an effect written in JavaScript, which the server does not run."""


def _is_js_rule(rule: Mapping[str, Any]) -> bool:
    return rule.get("type") == "javaScript" and bool(rule.get("code"))


def is_rule_active(rule: Mapping[str, Any], data: Any = None, javascript: JavaScriptMode = "raise") -> bool:
    """True when the rule's condition holds: a JsonLogic result of exactly `true`."""
    if rule.get("type") == "jsonLogic":
        logic = rule.get("logic")
        return logic is not None and jsonlogic.apply(logic, data) is True
    if _is_js_rule(rule):
        if javascript == "raise":
            raise JavaScriptRule(f"rule {rule.get('name')!r} is JavaScript")
        return False
    return False


def get_affected_properties(
    rules: Sequence[Mapping[str, Any]] | None, data: Any = None, javascript: JavaScriptMode = "raise"
) -> dict[str, Any]:
    """The properties the active rules set, later effects overriding earlier ones.

    `{"hidden": True, "disabled": False}`; a property an effect leaves unset maps to `UNDEFINED`.
    """
    if rules is None:
        return {"hidden": False}
    properties: dict[str, Any] = {}
    for rule in rules:
        if not isinstance(rule, Mapping) or not is_rule_active(rule, data, javascript):
            continue
        for effect in rule.get("effects") or []:
            if not isinstance(effect, Mapping) or not effect.get("property"):
                continue
            target, kind = effect["property"].get("target"), effect["property"].get("type")
            value: Any = UNDEFINED
            if kind == "boolean":
                value = effect.get("boolean", UNDEFINED)
            elif kind == "logic" and effect.get("logic") is not None:
                value = jsonlogic.apply(effect["logic"], data)
            elif kind == "code" and effect.get("code"):
                if javascript == "raise":
                    raise JavaScriptRule(f"an effect of rule {rule.get('name')!r} is JavaScript")
            elif kind == "string":
                value = effect.get("string", UNDEFINED)
            properties[str(target)] = value
    return properties


def hidden_keys(spec: Any, data: Any = None, javascript: JavaScriptMode = "raise") -> set[str]:
    """The keys the rules hide on this data: a hidden panel hides everything under it, collections stop
    the walk (their rows have their own rules)."""
    hidden: set[str] = set()

    def walk(brick: BrickSpec, parent_hidden: bool) -> None:
        rules = brick.get("rules")
        is_hidden = parent_hidden or (
            bool(rules) and get_affected_properties(rules, data, javascript).get("hidden") is True
        )
        key = configs_of(brick).get("key")
        if is_hidden and key:
            hidden.add(key)
        if brick.get("type") == "collection":
            return
        for child in brick.get("children") or []:
            walk(child, is_hidden)

    plain = as_spec(spec)
    if plain:
        walk(plain, False)
    return hidden


def javascript_hiding(brick: BrickSpec) -> Iterator[str]:
    """Names of the brick's rules whose hiding depends on JavaScript."""
    for rule in brick.get("rules") or []:
        if not isinstance(rule, Mapping):
            continue
        effects = [e for e in rule.get("effects") or [] if isinstance(e, Mapping)]
        hides = [e for e in effects if (e.get("property") or {}).get("target") == "hidden"]
        if not hides:
            continue
        if _is_js_rule(rule) or any((e.get("property") or {}).get("type") == "code" and e.get("code") for e in hides):
            yield str(rule.get("name"))
