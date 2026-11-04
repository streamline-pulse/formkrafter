"""JsonLogic, as `json-logic-js` 2.0.5 evaluates it in the browser: JavaScript coercions included.

`{"==": [1, "1"]}` is true, `{"+": ["1", 2]}` is 3, `{"<": [[2], 10]}` compares "2" with 10, `[]` is falsy.
Rules written for the renderers give the same answer here.
"""

from __future__ import annotations

import math
from collections.abc import Callable, Mapping, Sequence
from typing import Any

from formkrafter._js import (
    UNDEFINED,
    js_compare,
    js_string,
    js_truthy,
    loose_equals,
    parse_float,
    strict_equals,
    to_number,
)


class JsonLogicError(ValueError):
    """An unknown operation, or arguments JavaScript itself would throw on."""


def truthy(value: Any) -> bool:
    """JsonLogic truthiness: JavaScript's, except that an empty array is false."""
    if isinstance(value, list) and not value:
        return False
    return js_truthy(value)


def is_logic(logic: Any) -> bool:
    return isinstance(logic, Mapping) and len(logic) == 1


def _arg(values: Sequence[Any], index: int) -> Any:
    return values[index] if index < len(values) else UNDEFINED


def _number(value: float) -> int | float:
    return int(value) if isinstance(value, float) and value.is_integer() and abs(value) < 2**53 else value


def _less(a: Any, b: Any) -> bool:
    return js_compare(a, b) == -1


def _less_equal(a: Any, b: Any) -> bool:
    return js_compare(a, b) in (-1, 0)


def _var(data: Any, args: Sequence[Any]) -> Any:
    path = _arg(args, 0)
    default = _arg(args, 1)
    not_found = None if default is UNDEFINED else default
    if path is UNDEFINED or path == "" or path is None:
        return data
    for part in js_string(path).split("."):
        if data is None or data is UNDEFINED:
            return not_found
        data = _property(data, part)
        if data is UNDEFINED:
            return not_found
    return data


def _property(value: Any, name: str) -> Any:
    """`value[name]` with a string key: object keys, array and string indices, `length`."""
    if isinstance(value, Mapping):
        return value[name] if name in value else UNDEFINED
    if isinstance(value, list | str):
        if name == "length":
            return len(value)
        if name.isdigit() and (name == "0" or not name.startswith("0")) and int(name) < len(value):
            return value[int(name)]
    return UNDEFINED


def _missing(data: Any, args: Sequence[Any]) -> list[Any]:
    keys = args[0] if args and isinstance(args[0], list) else args
    out = []
    for key in keys:
        value = apply({"var": key}, data)
        if value is None or value == "" and isinstance(value, str):
            out.append(key)
    return out


def _missing_some(data: Any, args: Sequence[Any]) -> Any:
    need, options = _arg(args, 0), _arg(args, 1)
    if not isinstance(options, list):
        raise JsonLogicError("missing_some expects a list of keys")
    missing = _missing(data, [options])
    count = to_number(len(options) - len(missing))
    return [] if _less_equal(need, count) else missing


def _in(a: Any, b: Any) -> bool:
    if not js_truthy(b):
        return False
    if isinstance(b, str):
        return js_string(a) in b
    if isinstance(b, list):
        return any(strict_equals(a, item) for item in b)
    return False


def _substr(source: Any, start: Any, end: Any) -> str:
    text = js_string(source)
    if end is not UNDEFINED and _less(end, 0):
        temp = _js_substr(text, start, UNDEFINED)
        return _js_substr(temp, 0, len(temp.encode("utf-16-le")) // 2 + _integer(end))
    return _js_substr(text, start, end)


def _integer(value: Any) -> int | float:
    """ToIntegerOrInfinity."""
    n = to_number(value)
    if math.isnan(n):
        return 0
    if math.isinf(n):
        return n
    return math.trunc(n)


def _js_substr(text: str, start: Any, length: Any) -> str:
    """`String.prototype.substr` on UTF-16 code units."""
    units = text.encode("utf-16-le")
    size = len(units) // 2
    begin = _integer(start)
    if begin == -math.inf:
        begin = 0
    elif begin < 0:
        begin = max(size + begin, 0)
    begin = min(begin, size)
    count = size if length is UNDEFINED else _integer(length)
    count = min(max(count, 0), size - begin)
    if count <= 0:
        return ""
    chunk = units[int(begin) * 2 : int(begin + count) * 2]
    return chunk.decode("utf-16-le", errors="surrogatepass")


def _plus(*values: Any) -> int | float:
    total: float = 0
    for value in values:
        total = parse_float(total) + parse_float(value)
    return _number(total)


def _times(*values: Any) -> Any:
    if not values:
        raise JsonLogicError("Reduce of empty array with no initial value")
    result = values[0]
    for value in values[1:]:
        result = _number(parse_float(result) * parse_float(value))
    return result


def _minus(a: Any, b: Any = UNDEFINED) -> int | float:
    if b is UNDEFINED:
        return _number(-float(to_number(a)))
    return _number(float(to_number(a)) - float(to_number(b)))


def _divide(a: Any, b: Any) -> int | float:
    x, y = float(to_number(a)), float(to_number(b))
    if y == 0:
        if x == 0 or math.isnan(x):
            return math.nan
        return math.copysign(math.inf, x) * math.copysign(1, y)
    return _number(x / y)


def _modulo(a: Any, b: Any) -> int | float:
    x, y = float(to_number(a)), float(to_number(b))
    if y == 0 or math.isinf(x) or math.isnan(x) or math.isnan(y):
        return math.nan
    if math.isinf(y):
        return _number(x)
    return _number(math.fmod(x, y))


def _extreme(pick: Callable[[float, float], bool], start: float, *values: Any) -> int | float:
    result = start
    for value in values:
        n = float(to_number(value))
        if math.isnan(n):
            return math.nan
        if pick(n, result):
            result = n
    return _number(result)


def _merge(*values: Any) -> list[Any]:
    out: list[Any] = []
    for value in values:
        if isinstance(value, list):
            out.extend(value)
        else:
            out.append(value)
    return out


def _between(compare: Callable[[Any, Any], bool]) -> Callable[..., bool]:
    def op(a: Any = UNDEFINED, b: Any = UNDEFINED, c: Any = UNDEFINED) -> bool:
        if c is UNDEFINED:
            return compare(a, b)
        return compare(a, b) and compare(b, c)

    return op


_OPERATIONS: dict[str, Callable[..., Any]] = {
    "==": lambda a=UNDEFINED, b=UNDEFINED, *_: loose_equals(a, b),
    "===": lambda a=UNDEFINED, b=UNDEFINED, *_: strict_equals(a, b),
    "!=": lambda a=UNDEFINED, b=UNDEFINED, *_: not loose_equals(a, b),
    "!==": lambda a=UNDEFINED, b=UNDEFINED, *_: not strict_equals(a, b),
    ">": lambda a=UNDEFINED, b=UNDEFINED, *_: _less(b, a),
    ">=": lambda a=UNDEFINED, b=UNDEFINED, *_: _less_equal(b, a),
    "<": _between(_less),
    "<=": _between(_less_equal),
    "!!": lambda a=UNDEFINED, *_: truthy(a),
    "!": lambda a=UNDEFINED, *_: not truthy(a),
    "%": lambda a=UNDEFINED, b=UNDEFINED, *_: _modulo(a, b),
    "log": lambda a=UNDEFINED, *_: a,
    "in": lambda a=UNDEFINED, b=UNDEFINED, *_: _in(a, b),
    "cat": lambda *values: "".join("" if v is None or v is UNDEFINED else js_string(v) for v in values),
    "substr": lambda source=UNDEFINED, start=UNDEFINED, end=UNDEFINED, *_: _substr(source, start, end),
    "+": _plus,
    "*": _times,
    "-": lambda a=UNDEFINED, b=UNDEFINED, *_: _minus(a, b),
    "/": lambda a=UNDEFINED, b=UNDEFINED, *_: _divide(a, b),
    "min": lambda *values: _extreme(lambda n, r: n < r, math.inf, *values),
    "max": lambda *values: _extreme(lambda n, r: n > r, -math.inf, *values),
    "merge": _merge,
}


def _scoped(values: list[Any], data: Any) -> tuple[Any, Any]:
    return apply(_arg(values, 0), data), _arg(values, 1)


def apply(logic: Any, data: Any = None) -> Any:
    """Evaluate `logic` against `data`, as `jsonLogic.apply(logic, data)`."""
    if isinstance(logic, list):
        return [apply(item, data) for item in logic]
    if not is_logic(logic):
        return logic

    op = next(iter(logic))
    raw = logic[op]
    values: list[Any] = raw if isinstance(raw, list) else [raw]

    if op in ("if", "?:"):
        i = 0
        while i < len(values) - 1:
            if truthy(apply(values[i], data)):
                return apply(values[i + 1], data)
            i += 2
        return apply(values[i], data) if len(values) == i + 1 else None
    if op == "and":
        current: Any = UNDEFINED
        for value in values:
            current = apply(value, data)
            if not truthy(current):
                return current
        return current
    if op == "or":
        current = UNDEFINED
        for value in values:
            current = apply(value, data)
            if truthy(current):
                return current
        return current
    if op in ("filter", "map", "all", "none", "some"):
        scoped, rule = _scoped(values, data)
        if op == "filter":
            return [item for item in scoped if truthy(apply(rule, item))] if isinstance(scoped, list) else []
        if op == "map":
            return [apply(rule, item) for item in scoped] if isinstance(scoped, list) else []
        if not isinstance(scoped, list) or not scoped:
            return op == "none"
        if op == "all":
            return all(truthy(apply(rule, item)) for item in scoped)
        if op == "none":
            return not any(truthy(apply(rule, item)) for item in scoped)
        return any(truthy(apply(rule, item)) for item in scoped)
    if op == "reduce":
        scoped, rule = _scoped(values, data)
        initial = apply(values[2], data) if len(values) > 2 else None
        if not isinstance(scoped, list):
            return initial
        accumulator = initial
        for item in scoped:
            accumulator = apply(rule, {"current": item, "accumulator": accumulator})
        return accumulator

    args = [apply(value, data) for value in values]
    if op == "var":
        return _var(data, args)
    if op == "missing":
        return _missing(data, args)
    if op == "missing_some":
        return _missing_some(data, args)
    operation = _OPERATIONS.get(op)
    if operation is None:
        raise JsonLogicError(f"Unrecognized operation {op}")
    return operation(*args)


def uses_data(logic: Any) -> list[Any]:
    """The variables a rule reads (`jsonLogic.uses_data`)."""
    out: list[Any] = []
    if is_logic(logic):
        op = next(iter(logic))
        values = logic[op] if isinstance(logic[op], list) else [logic[op]]
        if op == "var":
            out.append(_arg(values, 0))
        else:
            for value in values:
                out.extend(uses_data(value))
    unique: list[Any] = []
    for item in out:
        if not any(strict_equals(item, seen) for seen in unique):
            unique.append(item)
    return unique
