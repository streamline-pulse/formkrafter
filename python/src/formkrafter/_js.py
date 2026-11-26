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


class _Undefined:
    """JavaScript `undefined`, where it differs from `null` (None): `Number(undefined)` is NaN, not 0."""

    _instance: _Undefined | None = None

    def __new__(cls) -> _Undefined:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __repr__(self) -> str:
        return "undefined"

    def __bool__(self) -> bool:
        return False


UNDEFINED = _Undefined()

# JavaScript's whitespace (String.prototype.trim, \s): wider than str.strip() on a few code points
JS_WHITESPACE = (
    "\t\n\v\f\r \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a"
    "\u2028\u2029\u202f\u205f\u3000\ufeff"
)


def js_trim(text: str) -> str:
    return text.strip(JS_WHITESPACE)


def to_number(value: Any) -> Number:
    """`Number(value)`: "12" is 12, "" and null are 0, true is 1, undefined and anything unreadable NaN."""
    if isinstance(value, bool):
        return int(value)
    if value is None:
        return 0
    if isinstance(value, int | float):
        return _tidy(float(value)) if isinstance(value, float) else value
    if isinstance(value, str):
        text = js_trim(value)
        if not text:
            return 0
        lowered = text.lower()
        for prefix, base in (("0x", 16), ("0o", 8), ("0b", 2)):
            if lowered.startswith(prefix):
                return _parse_radix(text[2:], base)
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
    if isinstance(value, list):
        return to_number(js_string(value))
    return math.nan


def _parse_radix(digits: str, base: int) -> Number:
    allowed = "0123456789abcdefghijklmnopqrstuvwxyz"[:base]
    if not digits or any(c not in allowed for c in digits.lower()):
        return math.nan
    return int(digits, base)


_FLOAT_PREFIX = _re.compile(r"[+-]?(?:Infinity|(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][+-]?[0-9]+)?)")


def parse_float(value: Any) -> float:
    """`parseFloat(value)`: the longest number at the start of `String(value)`, else NaN."""
    match = _FLOAT_PREFIX.match(js_trim(js_string(value)))
    if not match:
        return math.nan
    text = match.group(0)
    return float(text.replace("Infinity", "inf"))


def js_string(value: Any) -> str:
    """`String(value)`: null is "null", arrays are joined with commas (null and undefined as "")."""
    if value is None:
        return "null"
    if value is UNDEFINED:
        return "undefined"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int | float):
        return number_to_string(value)
    if isinstance(value, list):
        return ",".join("" if v is None or v is UNDEFINED else js_string(v) for v in value)
    if isinstance(value, dict):
        return "[object Object]"
    return str(value)


def js_truthy(value: Any) -> bool:
    """`!!value`: false for null, undefined, false, 0, NaN and ""; every object is true."""
    if value is None or value is UNDEFINED or value is False:
        return False
    if isinstance(value, int | float):
        return value != 0 and not math.isnan(value)
    if isinstance(value, str):
        return value != ""
    return True


def js_type(value: Any) -> str:
    if value is UNDEFINED:
        return "undefined"
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, int | float):
        return "number"
    if isinstance(value, str):
        return "string"
    return "object"


def strict_equals(a: Any, b: Any) -> bool:
    """`a === b`: same type and value; objects by identity."""
    kind = js_type(a)
    if kind != js_type(b):
        return False
    if kind in ("undefined", "null"):
        return True
    if kind == "object":
        return a is b
    return bool(a == b)


def loose_equals(a: Any, b: Any) -> bool:
    """`a == b`, with JavaScript's coercions: "1" == 1, true == 1, [1] == "1", null == undefined."""
    ka, kb = js_type(a), js_type(b)
    if ka == kb:
        return strict_equals(a, b)
    if ka in ("undefined", "null") or kb in ("undefined", "null"):
        return ka in ("undefined", "null") and kb in ("undefined", "null")
    if ka == "boolean":
        return loose_equals(to_number(a), b)
    if kb == "boolean":
        return loose_equals(a, to_number(b))
    if {ka, kb} == {"number", "string"}:
        return to_number(a) == to_number(b)
    if ka == "object":
        return loose_equals(js_string(a), b)
    if kb == "object":
        return loose_equals(a, js_string(b))
    return False


def _primitive(value: Any) -> Any:
    return js_string(value) if isinstance(value, list | dict) else value


def js_compare(a: Any, b: Any) -> int | None:
    """The abstract relational comparison behind `<`: -1, 0 or 1, None when NaN makes it undefined."""
    pa, pb = _primitive(a), _primitive(b)
    if isinstance(pa, str) and isinstance(pb, str):
        ua, ub = pa.encode("utf-16-be"), pb.encode("utf-16-be")
        return (ua > ub) - (ua < ub)
    na, nb = to_number(pa), to_number(pb)
    if math.isnan(na) or math.isnan(nb):
        return None
    return (na > nb) - (na < nb)


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
    assert isinstance(exponent, int)
    exp = exponent + len(mantissa) - 1
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
    """`new RegExp(pattern, "u")` as a Python pattern, with JavaScript's semantics: `$` anchors the very end
    only, `.` stops at every line terminator, `\\d`, `\\w`, `\\b` are ASCII and `\\s` is JavaScript's whitespace.
    """
    out: list[str] = []
    in_class = False
    i = 0
    while i < len(pattern):
        c = pattern[i]
        if c == "\\" and i + 1 < len(pattern):
            escape = pattern[i + 1]
            i += 2
            translated = (_CLASS_ESCAPES if in_class else _ESCAPES).get(escape)
            if translated is not None:
                out.append(translated)
            elif escape == "c" and i < len(pattern) and pattern[i].isascii() and pattern[i].isalpha():
                out.append(f"\\x{ord(pattern[i]) % 32:02x}")
                i += 1
            else:
                out.append("\\" + escape)
            continue
        if in_class:
            if c == "]":
                in_class = False
            elif c in "[&~|" or (c == "-" and pattern.startswith("--", i)):
                c = "\\" + c
        elif c == "[":
            negated = pattern.startswith("[^", i)
            first = i + 2 if negated else i + 1
            if pattern.startswith("]", first):
                out.append(r"[\s\S]" if negated else "(?!)")
                i = first + 1
                continue
            in_class = True
            if negated:
                c, i = "[^", i + 1
        elif c == "$":
            c = r"\Z"
        elif c == ".":
            c = r"[^\n\r\u2028\u2029]"
        elif pattern.startswith("(?<", i) and not pattern.startswith(("(?<=", "(?<!"), i):
            c, i = "(?P<", i + 2
        out.append(c)
        i += 1
    return _re.compile("".join(out))


_JS_SPACES = r"\t\n\x0b\x0c\r \xa0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff"
# Python cannot nest classes: negated escapes inside brackets are written as explicit ranges
_NOT_DIGIT = r"\x00-/:-\U0010ffff"
_NOT_WORD = r"\x00-/:-@\[-\^`{-\U0010ffff"
_NOT_SPACE = (
    r"\x00-\x08\x0e-\x1f!-\x9f\xa1-\u167f\u1681-\u1fff\u200b-\u2027\u202a-\u202e"
    r"\u2030-\u205e\u2060-\u2fff\u3001-\ufefe\uff00-\U0010ffff"
)
_ESCAPES = {
    "d": "[0-9]",
    "D": "[^0-9]",
    "w": "[A-Za-z0-9_]",
    "W": "[^A-Za-z0-9_]",
    "s": f"[{_JS_SPACES}]",
    "S": f"[^{_JS_SPACES}]",
    "b": r"(?a:\b)",
    "B": r"(?a:\B)",
}
_CLASS_ESCAPES = {
    "d": "0-9",
    "w": "A-Za-z0-9_",
    "s": _JS_SPACES,
    "D": _NOT_DIGIT,
    "W": _NOT_WORD,
    "S": _NOT_SPACE,
    "b": r"\x08",
}


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
