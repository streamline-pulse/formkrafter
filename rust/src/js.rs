//! JavaScript semantics the core relies on: `Number()`, `String()` of a number, Ajv's formats and `RegExp`.
//!
//! The core runs in a JavaScript engine and Ajv; the port reproduces the few places where Rust would
//! otherwise disagree (`String(1e-7)` is "1e-7", `$` never matches before a trailing newline, `\d` is ASCII).

use std::sync::OnceLock;

use regex::{Regex, RegexBuilder};
use serde_json::Value;

/// A JavaScript value: JSON, plus `undefined` and non-finite numbers.
///
/// `Undefined` differs from `Null` where JavaScript says so (`Number(undefined)` is NaN, not 0).
#[derive(Clone, Debug, PartialEq)]
pub enum Js {
    Undefined,
    Null,
    Bool(bool),
    Int(i64),
    Float(f64),
    Str(String),
    Arr(Vec<Js>),
    Obj(Vec<(String, Js)>),
}

impl Js {
    /// What JSON holds of a value; non-finite floats cannot appear (fixtures only carry JSON).
    pub fn from_json(value: &Value) -> Js {
        match value {
            Value::Null => Js::Null,
            Value::Bool(b) => Js::Bool(*b),
            Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    Js::Int(i)
                } else if let Some(u) = n.as_u64() {
                    if u <= i64::MAX as u64 {
                        Js::Int(u as i64)
                    } else {
                        Js::Float(u as f64)
                    }
                } else {
                    Js::Float(n.as_f64().unwrap_or(f64::NAN))
                }
            }
            Value::String(s) => Js::Str(s.clone()),
            Value::Array(items) => Js::Arr(items.iter().map(Js::from_json).collect()),
            Value::Object(map) => Js::Obj(
                map.iter()
                    .map(|(k, v)| (k.clone(), Js::from_json(v)))
                    .collect(),
            ),
        }
    }

    /// The value as JSON, as `JSON.stringify` writes it: `undefined`, NaN and infinities become null.
    pub fn as_json(&self) -> Value {
        match self {
            Js::Undefined | Js::Null => Value::Null,
            Js::Bool(b) => Value::Bool(*b),
            Js::Int(i) => Value::from(*i),
            Js::Float(n) => serde_json::Number::from_f64(*n)
                .map(Value::Number)
                .unwrap_or(Value::Null),
            Js::Str(s) => Value::String(s.clone()),
            Js::Arr(items) => Value::Array(items.iter().map(Js::as_json).collect()),
            Js::Obj(entries) => Value::Object(
                entries
                    .iter()
                    .map(|(k, v)| (k.clone(), v.as_json()))
                    .collect(),
            ),
        }
    }

    pub fn get(&self, key: &str) -> &Js {
        match self {
            Js::Obj(entries) => entries
                .iter()
                .find(|(k, _)| k == key)
                .map(|(_, v)| v)
                .unwrap_or(&Js::Undefined),
            _ => &Js::Undefined,
        }
    }
}

/// JavaScript's whitespace (String.prototype.trim, \s): wider than char::is_whitespace on \u{FEFF}.
const JS_WHITESPACE: &[char] = &[
    '\t', '\n', '\u{b}', '\u{c}', '\r', ' ', '\u{a0}', '\u{1680}', '\u{2000}', '\u{2001}',
    '\u{2002}', '\u{2003}', '\u{2004}', '\u{2005}', '\u{2006}', '\u{2007}', '\u{2008}', '\u{2009}',
    '\u{200a}', '\u{2028}', '\u{2029}', '\u{202f}', '\u{205f}', '\u{3000}', '\u{feff}',
];

pub fn is_js_whitespace(c: char) -> bool {
    JS_WHITESPACE.contains(&c)
}

pub fn js_trim(text: &str) -> &str {
    text.trim_matches(is_js_whitespace)
}

/// `Number(value)`: "12" is 12, "" and null are 0, true is 1, undefined and anything unreadable NaN.
pub fn to_number(value: &Js) -> f64 {
    match value {
        Js::Undefined => f64::NAN,
        Js::Null => 0.0,
        Js::Bool(b) => i32::from(*b) as f64,
        Js::Int(i) => *i as f64,
        Js::Float(n) => *n,
        Js::Str(_) => {
            let text = js_trim(value.as_str());
            if text.is_empty() {
                return 0.0;
            }
            let lowered = text.to_lowercase();
            for (prefix, base) in [("0x", 16), ("0o", 8), ("0b", 2)] {
                if lowered.starts_with(prefix) {
                    return parse_radix(&text[2..], base);
                }
            }
            if text == "Infinity" || text == "+Infinity" {
                return f64::INFINITY;
            }
            if text == "-Infinity" {
                return f64::NEG_INFINITY;
            }
            // Rust's f64 parser accepts "inf"/"nan", JavaScript's Number() does not
            if text.contains('_')
                || matches!(
                    lowered.trim_start_matches(['+', '-']),
                    "inf" | "infinity" | "nan"
                )
            {
                return f64::NAN;
            }
            text.parse::<f64>().unwrap_or(f64::NAN)
        }
        Js::Arr(_) | Js::Obj(_) => to_number(&Js::Str(js_string(value))),
    }
}

fn parse_radix(digits: &str, base: u32) -> f64 {
    if digits.is_empty() {
        return f64::NAN;
    }
    let mut total = 0.0;
    for c in digits.chars() {
        match c.to_digit(base) {
            Some(d) => total = total * f64::from(base) + f64::from(d),
            None => return f64::NAN,
        }
    }
    total
}

impl Js {
    fn as_str(&self) -> &str {
        match self {
            Js::Str(s) => s,
            _ => "",
        }
    }
}

/// `Number(value)` as a JSON-ready value: an integral float as an int, within the range
/// JavaScript counts exactly; NaN and infinities become null (they cannot be valid JSON).
pub fn number_value(n: f64) -> Value {
    if n.is_finite() {
        if n.fract() == 0.0 && n.abs() < (1u64 << 53) as f64 {
            return Value::from(n as i64);
        }
        if let Some(number) = serde_json::Number::from_f64(n) {
            return Value::Number(number);
        }
    }
    Value::Null
}

/// An integral float as an int (JSON writes 3, not 3.0), within the range JavaScript counts exactly.
pub fn tidy(n: f64) -> Js {
    if n.is_finite() && n.fract() == 0.0 && n.abs() < (1u64 << 53) as f64 {
        Js::Int(n as i64)
    } else {
        Js::Float(n)
    }
}

fn float_prefix() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r"^[+-]?(?:Infinity|(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][+-]?[0-9]+)?)").unwrap()
    })
}

/// `parseFloat(value)`: the longest number at the start of `String(value)`, else NaN.
pub fn parse_float(value: &Js) -> f64 {
    let stringified = js_string(value);
    let text = js_trim(&stringified);
    match float_prefix().find(text) {
        Some(m) => m
            .as_str()
            .replace("Infinity", "inf")
            .parse()
            .unwrap_or(f64::NAN),
        None => f64::NAN,
    }
}

/// `String(value)`: null is "null", arrays are joined with commas (null and undefined as "").
pub fn js_string(value: &Js) -> String {
    match value {
        Js::Null => "null".to_string(),
        Js::Undefined => "undefined".to_string(),
        Js::Bool(b) => if *b { "true" } else { "false" }.to_string(),
        Js::Int(i) => i.to_string(),
        Js::Float(n) => number_to_string(*n),
        Js::Str(s) => s.clone(),
        Js::Arr(items) => items
            .iter()
            .map(|v| match v {
                Js::Null | Js::Undefined => String::new(),
                other => js_string(other),
            })
            .collect::<Vec<_>>()
            .join(","),
        Js::Obj(_) => "[object Object]".to_string(),
    }
}

/// `!!value`: false for null, undefined, false, 0, NaN and ""; every object is true.
pub fn js_truthy(value: &Js) -> bool {
    match value {
        Js::Undefined | Js::Null => false,
        Js::Bool(b) => *b,
        Js::Int(i) => *i != 0,
        Js::Float(n) => *n != 0.0 && !n.is_nan(),
        Js::Str(s) => !s.is_empty(),
        Js::Arr(_) | Js::Obj(_) => true,
    }
}

pub fn js_type(value: &Js) -> &'static str {
    match value {
        Js::Undefined => "undefined",
        Js::Null => "null",
        Js::Bool(_) => "boolean",
        Js::Int(_) | Js::Float(_) => "number",
        Js::Str(_) => "string",
        Js::Arr(_) | Js::Obj(_) => "object",
    }
}

/// `a === b`: same type and value; objects by identity (compared structurally never equal here,
/// as references cannot cross the JSON boundary).
pub fn strict_equals(a: &Js, b: &Js) -> bool {
    let kind = js_type(a);
    if kind != js_type(b) {
        return false;
    }
    match (a, b) {
        (Js::Undefined, Js::Undefined) | (Js::Null, Js::Null) => true,
        (Js::Bool(x), Js::Bool(y)) => x == y,
        (Js::Int(x), Js::Int(y)) => x == y,
        (Js::Int(x), Js::Float(y)) | (Js::Float(y), Js::Int(x)) => (*x as f64) == *y,
        (Js::Float(x), Js::Float(y)) => x == y,
        (Js::Str(x), Js::Str(y)) => x == y,
        _ => false,
    }
}

/// `a == b`, with JavaScript's coercions: "1" == 1, true == 1, [1] == "1", null == undefined.
pub fn loose_equals(a: &Js, b: &Js) -> bool {
    let (ka, kb) = (js_type(a), js_type(b));
    if ka == kb {
        return strict_equals(a, b);
    }
    let nullish = |k: &str| k == "undefined" || k == "null";
    if nullish(ka) || nullish(kb) {
        return nullish(ka) && nullish(kb);
    }
    if ka == "boolean" {
        return loose_equals(&tidy(to_number(a)), b);
    }
    if kb == "boolean" {
        return loose_equals(a, &tidy(to_number(b)));
    }
    if (ka == "number" && kb == "string") || (ka == "string" && kb == "number") {
        return to_number(a) == to_number(b);
    }
    if ka == "object" {
        return loose_equals(&Js::Str(js_string(a)), b);
    }
    if kb == "object" {
        return loose_equals(a, &Js::Str(js_string(b)));
    }
    false
}

fn primitive(value: &Js) -> Js {
    match value {
        Js::Arr(_) | Js::Obj(_) => Js::Str(js_string(value)),
        other => other.clone(),
    }
}

/// The abstract relational comparison behind `<`: -1, 0 or 1, None when NaN makes it undefined.
pub fn js_compare(a: &Js, b: &Js) -> Option<i8> {
    let (pa, pb) = (primitive(a), primitive(b));
    if let (Js::Str(sa), Js::Str(sb)) = (&pa, &pb) {
        return Some(match sa.encode_utf16().cmp(sb.encode_utf16()) {
            std::cmp::Ordering::Less => -1,
            std::cmp::Ordering::Equal => 0,
            std::cmp::Ordering::Greater => 1,
        });
    }
    let (na, nb) = (to_number(&pa), to_number(&pb));
    if na.is_nan() || nb.is_nan() {
        return None;
    }
    Some(if na > nb {
        1
    } else if na < nb {
        -1
    } else {
        0
    })
}

/// `String(n)`: 1 → "1", 0.5 → "0.5", 1e-7 → "1e-7", 1e21 → "1e+21".
pub fn number_to_string(n: f64) -> String {
    if n.is_nan() {
        return "NaN".to_string();
    }
    if n.is_infinite() {
        return if n > 0.0 { "Infinity" } else { "-Infinity" }.to_string();
    }
    if n == 0.0 {
        return "0".to_string();
    }
    let abs = n.abs();
    if (1e-6..1e21).contains(&abs) {
        // Rust's Display never uses scientific notation and prints the shortest round-trip digits
        return n.to_string();
    }
    // `{:e}` gives the shortest mantissa with a bare exponent ("1.5e-7"): add JavaScript's "+"
    let text = format!("{:e}", abs);
    let (mantissa, exponent) = text.split_once('e').expect("LowerExp always has e");
    let exp: i64 = exponent.parse().expect("LowerExp exponent is a number");
    format!(
        "{}{}e{}{}",
        if n < 0.0 { "-" } else { "" },
        mantissa,
        if exp >= 0 { "+" } else { "-" },
        exp.abs()
    )
}

/// `String(value ?? "")`, as the default messages interpolate `{value}`.
pub fn to_string(value: &Js) -> String {
    match value {
        Js::Null | Js::Undefined => String::new(),
        Js::Bool(b) => if *b { "true" } else { "false" }.to_string(),
        Js::Int(i) => i.to_string(),
        Js::Float(n) => number_to_string(*n),
        Js::Str(s) => s.clone(),
        Js::Arr(items) => items
            .iter()
            .map(|v| match v {
                Js::Null | Js::Undefined => String::new(),
                other => to_string(other),
            })
            .collect::<Vec<_>>()
            .join(","),
        Js::Obj(_) => "[object Object]".to_string(),
    }
}

const JS_SPACE_CLASS: &str = r"\t\n\x0B\x0C\r \u{A0}\u{1680}\u{2000}-\u{200A}\u{2028}\u{2029}\u{202F}\u{205F}\u{3000}\u{FEFF}";

fn class_escape(escape: char) -> Option<String> {
    Some(match escape {
        'd' => "0-9".to_string(),
        'w' => "A-Za-z0-9_".to_string(),
        's' => JS_SPACE_CLASS.to_string(),
        'D' => "[^0-9]".to_string(),
        'W' => "[^A-Za-z0-9_]".to_string(),
        'S' => format!("[^{JS_SPACE_CLASS}]"),
        'b' => r"\x08".to_string(),
        _ => return None,
    })
}

fn atom_escape(escape: char) -> Option<String> {
    Some(match escape {
        'd' => "[0-9]".to_string(),
        'D' => "[^0-9]".to_string(),
        'w' => "[A-Za-z0-9_]".to_string(),
        'W' => "[^A-Za-z0-9_]".to_string(),
        's' => format!("[{JS_SPACE_CLASS}]"),
        'S' => format!("[^{JS_SPACE_CLASS}]"),
        'b' => r"(?-u:\b)".to_string(),
        'B' => r"(?-u:\B)".to_string(),
        _ => return None,
    })
}

/// `new RegExp(pattern, "u")` as a Rust pattern, with JavaScript's semantics: `$` anchors the very
/// end only, `.` stops at every line terminator, `\d`, `\w`, `\b` are ASCII and `\s` is JavaScript's
/// whitespace. Constructs Rust cannot run (look-around, backreferences) fail to compile.
pub fn compile_pattern(pattern: &str) -> Result<Regex, regex::Error> {
    let chars: Vec<char> = pattern.chars().collect();
    let mut out = String::new();
    let mut in_class = false;
    let mut i = 0;
    while i < chars.len() {
        let c = chars[i];
        if c == '\\' && i + 1 < chars.len() {
            let escape = chars[i + 1];
            i += 2;
            let translated = if in_class {
                class_escape(escape)
            } else {
                atom_escape(escape)
            };
            match translated {
                Some(text) => out.push_str(&text),
                None if escape == '0' && !chars.get(i).is_some_and(char::is_ascii_digit) => {
                    out.push_str(r"\x00")
                }
                None if escape == 'c' && chars.get(i).is_some_and(char::is_ascii_alphabetic) => {
                    out.push_str(&format!(r"\x{{{:02X}}}", chars[i] as u32 % 32));
                    i += 1;
                }
                None => {
                    out.push('\\');
                    out.push(escape);
                }
            }
            continue;
        }
        if in_class {
            match c {
                ']' => {
                    in_class = false;
                    out.push(c);
                }
                // literal in JavaScript, nested classes and set operators in Rust
                '[' | '&' | '~' => {
                    out.push('\\');
                    out.push(c);
                }
                '-' if chars.get(i + 1) == Some(&'-') => out.push_str(r"\-"),
                _ => out.push(c),
            }
        } else if c == '[' {
            let negated = chars.get(i + 1) == Some(&'^');
            let first = if negated { i + 2 } else { i + 1 };
            if chars.get(first) == Some(&']') {
                // `[]` matches nothing and `[^]` anything in JavaScript
                out.push_str(if negated { r"[\s\S]" } else { r"[^\s\S]" });
                i = first + 1;
                continue;
            }
            in_class = true;
            out.push(c);
            if negated {
                out.push('^');
                i += 1;
            }
        } else if c == '$' {
            out.push_str(r"\z");
        } else if c == '.' {
            out.push_str(r"[^\n\r\u{2028}\u{2029}]");
        } else if c == '('
            && chars.get(i + 1) == Some(&'?')
            && chars.get(i + 2) == Some(&'<')
            && !matches!(chars.get(i + 3), Some('=') | Some('!'))
        {
            out.push_str("(?P<");
            i += 2;
        } else {
            out.push(c);
        }
        i += 1;
    }
    Regex::new(&out)
}

fn email_pattern() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        RegexBuilder::new(
            r"^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\z",
        )
        .case_insensitive(true)
        .build()
        .unwrap()
    })
}

fn not_uri_fragment() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"/|:").unwrap())
}

fn uri_pattern() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        RegexBuilder::new(
            r"^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::[0-9]*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?\z",
        )
        .case_insensitive(true)
        .build()
        .unwrap()
    })
}

// ajv-formats 3, "full" mode, verbatim (the core registers them with `addFormats(ajv, ["email", "uri"])`).
// They carry no `u` flag, so digits and case folding are ASCII.
pub fn check_format(format: &str, value: &str) -> Option<bool> {
    match format {
        "email" => Some(email_pattern().is_match(value)),
        "uri" => Some(not_uri_fragment().is_match(value) && uri_pattern().is_match(value)),
        _ => None,
    }
}
