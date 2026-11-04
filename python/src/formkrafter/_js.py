"""JavaScript semantics the core relies on: `Number()`, `String()` of a number, Ajv's formats and `RegExp`.

The core runs in a JavaScript engine and Ajv; the port reproduces the few places where Python would
otherwise disagree (`String(1e-7)` is "1e-7", `$` never matches before a trailing newline, `\\d` is ASCII).
"""

from __future__ import annotations

import math
from decimal import Decimal
from typing import Any

try:  # `\p{L}` and other `u`-flag classes, when the optional `regex` module is installed
    import regex as _re  # type: ignore[import-not-found, import-untyped, unused-ignore]
except ImportError:  # pragma: no cover - exercised when regex is absent
    import re as _re

Number = int | float


def to_number(value: Any) -> Number:
    """`Number(value)`: "12" is 12, "" and null are 0, true is 1, anything unreadable is NaN."""
    if isinstance(value, bool):
        return int(value)
    if value is None:
        return 0
    if isinstance(value, int | float):
        return _tidy(float(value)) if isinstance(value, float) else value
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return 0
        lowered = text.lower()
        for prefix, base in (("0x", 16), ("0o", 8), ("0b", 2)):
            if lowered.startswith(prefix):
                try:
                    return int(text[2:], base)
                except ValueError:
                    return math.nan
        if text in ("Infinity", "+Infinity"):
            return math.inf
        if text == "-Infinity":
            return -math.inf
        if "_" in text or lowered.lstrip("+-") in ("inf", "infinity", "nan"):
            return math.nan
        try:
            return _tidy(float(text))
        except ValueError:
            return math.nan
    if isinstance(value, list) and len(value) <= 1:
        return to_number(value[0]) if value else 0
    return math.nan


def _tidy(n: float) -> Number:
    """An integral float as an int (JSON writes 3, not 3.0), within the range JavaScript counts exactly."""
    return int(n) if n.is_integer() and abs(n) < 2**53 else n


def number_to_string(n: Number) -> str:
    """`String(n)`: 1 → "1", 0.5 → "0.5", 1e-7 → "1e-7", 1e21 → "1e+21"."""
    if isinstance(n, bool):
        return "true" if n else "false"
    if isinstance(n, int):
        n_float = float(n)
        if abs(n) < 10**21:
            return str(n)
        n = n_float
    if math.isnan(n):
        return "NaN"
    if math.isinf(n):
        return "Infinity" if n > 0 else "-Infinity"
    if n == 0:
        return "0"
    digits = Decimal(repr(n))
    if 1e-6 <= abs(n) < 1e21:
        text = format(digits, "f")
        return text.rstrip("0").rstrip(".") if "." in text else text
    sign, coefficient, exponent = digits.normalize().as_tuple()
    mantissa = "".join(map(str, coefficient))
    exp = exponent + len(mantissa) - 1  # type: ignore[operator]
    body = mantissa[0] + ("." + mantissa[1:] if len(mantissa) > 1 else "")
    return f"{'-' if sign else ''}{body}e{'+' if exp >= 0 else '-'}{abs(exp)}"


def to_string(value: Any) -> str:
    """`String(value ?? "")`, as the default messages interpolate `{value}`."""
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int | float):
        return number_to_string(value)
    if isinstance(value, list):
        return ",".join("" if v is None else to_string(v) for v in value)
    if isinstance(value, dict):
        return "[object Object]"
    return str(value)


def compile_pattern(pattern: str) -> Any:
    """`new RegExp(pattern, "u")` as a Python pattern: `$` anchors the end only, named groups, ASCII `\\d` and `\\w`."""
    out: list[str] = []
    in_class = False
    i = 0
    while i < len(pattern):
        c = pattern[i]
        if c == "\\" and i + 1 < len(pattern):
            escape = pattern[i + 1]
            if in_class:
                out.append(_CLASS_ESCAPES.get(escape, pattern[i : i + 2]))
            else:
                out.append(_ESCAPES.get(escape, pattern[i : i + 2]))
            i += 2
            continue
        if in_class:
            if c == "]":
                in_class = False
        elif c == "[":
            in_class = True
        elif c == "$":
            c = r"\Z"
        elif pattern.startswith("(?<", i) and not pattern.startswith(("(?<=", "(?<!"), i):
            c, i = "(?P<", i + 2
        out.append(c)
        i += 1
    return _re.compile("".join(out))


# Under the `u` flag \d and \w are ASCII, while Python's are Unicode; \s stays Unicode in both.
_ESCAPES = {"d": "[0-9]", "D": "[^0-9]", "w": "[A-Za-z0-9_]", "W": "[^A-Za-z0-9_]"}
_CLASS_ESCAPES = {"d": "0-9", "w": "A-Za-z0-9_"}


# ajv-formats 3, "full" mode, verbatim (the core registers them with `addFormats(ajv, ["email", "uri"])`).
# They carry no `u` flag, so digits and case folding are ASCII.
_EMAIL = _re.compile(
    r"^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\Z",
    _re.IGNORECASE | _re.ASCII,
)
_NOT_URI_FRAGMENT = _re.compile(r"/|:")
_URI = _re.compile(
    r"^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?\Z",
    _re.IGNORECASE | _re.ASCII,
)

FORMATS = {
    "email": lambda s: bool(_EMAIL.search(s)),
    "uri": lambda s: bool(_NOT_URI_FRAGMENT.search(s)) and bool(_URI.search(s)),
}
