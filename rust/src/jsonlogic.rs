//! JsonLogic, as `json-logic-js` 2.0.5 evaluates it in the browser: JavaScript coercions included.
//!
//! `{"==": [1, "1"]}` is true, `{"+": ["1", 2]}` is 3, `{"<": [[2], 10]}` compares "2" with 10,
//! `[]` is falsy. Rules written for the renderers give the same answer here.

use std::fmt;

use crate::js::{
    js_compare, js_string, js_truthy, loose_equals, parse_float, strict_equals, tidy, to_number, Js,
};

/// An unknown operation, or arguments JavaScript itself would throw on.
#[derive(Clone, Debug)]
pub struct JsonLogicError(pub String);

impl fmt::Display for JsonLogicError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl std::error::Error for JsonLogicError {}

type Result<T> = std::result::Result<T, JsonLogicError>;

/// JsonLogic truthiness: JavaScript's, except that an empty array is false.
pub fn truthy(value: &Js) -> bool {
    if let Js::Arr(items) = value {
        if items.is_empty() {
            return false;
        }
    }
    js_truthy(value)
}

pub fn is_logic(logic: &Js) -> bool {
    matches!(logic, Js::Obj(entries) if entries.len() == 1)
}

fn arg(values: &[Js], index: usize) -> Js {
    values.get(index).cloned().unwrap_or(Js::Undefined)
}

fn less(a: &Js, b: &Js) -> bool {
    js_compare(a, b) == Some(-1)
}

fn less_equal(a: &Js, b: &Js) -> bool {
    matches!(js_compare(a, b), Some(-1) | Some(0))
}

fn property(value: &Js, name: &str) -> Js {
    match value {
        Js::Obj(entries) => entries
            .iter()
            .find(|(k, _)| k == name)
            .map(|(_, v)| v.clone())
            .unwrap_or(Js::Undefined),
        Js::Arr(items) => {
            if name == "length" {
                return Js::Int(items.len() as i64);
            }
            if is_index(name) {
                if let Ok(index) = name.parse::<usize>() {
                    return items.get(index).cloned().unwrap_or(Js::Undefined);
                }
            }
            Js::Undefined
        }
        Js::Str(text) => {
            if name == "length" {
                return Js::Int(text.encode_utf16().count() as i64);
            }
            if is_index(name) {
                if let Ok(index) = name.parse::<usize>() {
                    return text
                        .encode_utf16()
                        .nth(index)
                        .map(|unit| Js::Str(String::from_utf16_lossy(&[unit])))
                        .unwrap_or(Js::Undefined);
                }
            }
            Js::Undefined
        }
        _ => Js::Undefined,
    }
}

fn is_index(name: &str) -> bool {
    !name.is_empty()
        && name.bytes().all(|b| b.is_ascii_digit())
        && (name == "0" || !name.starts_with('0'))
}

fn var(data: &Js, args: &[Js]) -> Js {
    let path = arg(args, 0);
    let default = arg(args, 1);
    let not_found = if matches!(default, Js::Undefined) {
        Js::Null
    } else {
        default
    };
    if matches!(path, Js::Undefined | Js::Null) || matches!(&path, Js::Str(s) if s.is_empty()) {
        return data.clone();
    }
    let mut current = data.clone();
    for part in js_string(&path).split('.') {
        if matches!(current, Js::Null | Js::Undefined) {
            return not_found;
        }
        current = property(&current, part);
        if matches!(current, Js::Undefined) {
            return not_found;
        }
    }
    current
}

fn missing(data: &Js, args: &[Js]) -> Result<Js> {
    let keys: &[Js] = match args.first() {
        Some(Js::Arr(items)) => items,
        _ => args,
    };
    let mut out = Vec::new();
    for key in keys {
        let value = apply(&Js::Obj(vec![("var".to_string(), key.clone())]), data)?;
        if matches!(value, Js::Null) || matches!(&value, Js::Str(s) if s.is_empty()) {
            out.push(key.clone());
        }
    }
    Ok(Js::Arr(out))
}

fn missing_some(data: &Js, args: &[Js]) -> Result<Js> {
    let (need, options) = (arg(args, 0), arg(args, 1));
    let options = match options {
        Js::Arr(items) => items,
        _ => {
            return Err(JsonLogicError(
                "missing_some expects a list of keys".to_string(),
            ))
        }
    };
    let missing = missing(data, &[Js::Arr(options.clone())])?;
    let missing_len = match &missing {
        Js::Arr(items) => items.len(),
        _ => 0,
    };
    let count = tidy((options.len() - missing_len) as f64);
    if less_equal(&need, &count) {
        Ok(Js::Arr(vec![]))
    } else {
        Ok(missing)
    }
}

fn contains(a: &Js, b: &Js) -> bool {
    if !js_truthy(b) {
        return false;
    }
    match b {
        Js::Str(text) => text.contains(&js_string(a)),
        Js::Arr(items) => items.iter().any(|item| strict_equals(a, item)),
        _ => false,
    }
}

fn integer(value: &Js) -> f64 {
    let n = to_number(value);
    if n.is_nan() {
        0.0
    } else if n.is_infinite() {
        n
    } else {
        n.trunc()
    }
}

fn js_substr(text: &str, start: &Js, length: &Js) -> String {
    let units: Vec<u16> = text.encode_utf16().collect();
    let size = units.len() as f64;
    let mut begin = integer(start);
    if begin == f64::NEG_INFINITY {
        begin = 0.0;
    } else if begin < 0.0 {
        begin = (size + begin).max(0.0);
    }
    let begin = begin.min(size);
    let count = if matches!(length, Js::Undefined) {
        size
    } else {
        integer(length)
    };
    let count = count.clamp(0.0, size - begin);
    if count <= 0.0 {
        return String::new();
    }
    // A boundary can split a surrogate pair; the lossy decode replaces the orphan, where the
    // Python port keeps it (surrogatepass) — invisible in JSON, which cannot hold lone surrogates.
    String::from_utf16_lossy(&units[begin as usize..(begin + count) as usize])
}

fn substr(source: &Js, start: &Js, end: &Js) -> Js {
    let text = js_string(source);
    if !matches!(end, Js::Undefined) && less(end, &Js::Int(0)) {
        let temp = js_substr(&text, start, &Js::Undefined);
        let length = temp.encode_utf16().count() as f64 + integer(end);
        return Js::Str(js_substr(&temp, &Js::Int(0), &Js::Float(length)));
    }
    Js::Str(js_substr(&text, start, end))
}

fn plus(values: &[Js]) -> Js {
    let mut total = Js::Int(0);
    for value in values {
        total = Js::Float(parse_float(&total) + parse_float(value));
    }
    match total {
        Js::Float(n) => tidy(n),
        other => other,
    }
}

fn times(values: &[Js]) -> Result<Js> {
    if values.is_empty() {
        return Err(JsonLogicError(
            "Reduce of empty array with no initial value".to_string(),
        ));
    }
    let mut result = values[0].clone();
    for value in &values[1..] {
        result = tidy(parse_float(&result) * parse_float(value));
    }
    Ok(result)
}

fn minus(a: &Js, b: &Js) -> Js {
    if matches!(b, Js::Undefined) {
        tidy(-to_number(a))
    } else {
        tidy(to_number(a) - to_number(b))
    }
}

fn divide(a: &Js, b: &Js) -> Js {
    let (x, y) = (to_number(a), to_number(b));
    if y == 0.0 {
        if x == 0.0 || x.is_nan() {
            return Js::Float(f64::NAN);
        }
        return Js::Float(x.signum() * y.signum() * f64::INFINITY);
    }
    tidy(x / y)
}

fn modulo(a: &Js, b: &Js) -> Js {
    let (x, y) = (to_number(a), to_number(b));
    if y == 0.0 || x.is_infinite() || x.is_nan() || y.is_nan() {
        return Js::Float(f64::NAN);
    }
    if y.is_infinite() {
        return tidy(x);
    }
    tidy(x % y)
}

fn extreme(values: &[Js], pick_max: bool) -> Js {
    let mut result = if pick_max {
        f64::NEG_INFINITY
    } else {
        f64::INFINITY
    };
    for value in values {
        let n = to_number(value);
        if n.is_nan() {
            return Js::Float(f64::NAN);
        }
        if (pick_max && n > result) || (!pick_max && n < result) {
            result = n;
        }
    }
    tidy(result)
}

fn merge(values: &[Js]) -> Js {
    let mut out = Vec::new();
    for value in values {
        match value {
            Js::Arr(items) => out.extend(items.iter().cloned()),
            other => out.push(other.clone()),
        }
    }
    Js::Arr(out)
}

fn cat(values: &[Js]) -> Js {
    Js::Str(
        values
            .iter()
            .map(|v| match v {
                Js::Null | Js::Undefined => String::new(),
                other => js_string(other),
            })
            .collect::<String>(),
    )
}

fn between(a: &Js, b: &Js, c: &Js, or_equal: bool) -> Result<Js> {
    let compare = |x: &Js, y: &Js| {
        if or_equal {
            less_equal(x, y)
        } else {
            less(x, y)
        }
    };
    let result = if matches!(c, Js::Undefined) {
        compare(a, b)
    } else {
        compare(a, b) && compare(b, c)
    };
    Ok(Js::Bool(result))
}

/// Evaluate `logic` against `data`, as `jsonLogic.apply(logic, data)`.
pub fn apply(logic: &Js, data: &Js) -> Result<Js> {
    if let Js::Arr(items) = logic {
        return Ok(Js::Arr(
            items
                .iter()
                .map(|item| apply(item, data))
                .collect::<Result<Vec<_>>>()?,
        ));
    }
    if !is_logic(logic) {
        return Ok(logic.clone());
    }
    let (op, raw) = match logic {
        Js::Obj(entries) => (&entries[0].0, &entries[0].1),
        _ => unreachable!("is_logic checked"),
    };
    let values: Vec<Js> = match raw {
        Js::Arr(items) => items.clone(),
        other => vec![other.clone()],
    };

    match op.as_str() {
        "if" | "?:" => {
            let mut i = 0;
            while i + 1 < values.len() {
                if truthy(&apply(&values[i], data)?) {
                    return apply(&values[i + 1], data);
                }
                i += 2;
            }
            if values.len() == i + 1 {
                apply(&values[i], data)
            } else {
                Ok(Js::Null)
            }
        }
        "and" => {
            let mut current = Js::Undefined;
            for value in &values {
                current = apply(value, data)?;
                if !truthy(&current) {
                    return Ok(current);
                }
            }
            Ok(current)
        }
        "or" => {
            let mut current = Js::Undefined;
            for value in &values {
                current = apply(value, data)?;
                if truthy(&current) {
                    return Ok(current);
                }
            }
            Ok(current)
        }
        "filter" | "map" | "all" | "none" | "some" => {
            let scoped = apply(&arg(&values, 0), data)?;
            let rule = arg(&values, 1);
            match op.as_str() {
                "filter" => Ok(match scoped {
                    Js::Arr(items) => {
                        let mut out = Vec::new();
                        for item in items {
                            if truthy(&apply(&rule, &item)?) {
                                out.push(item);
                            }
                        }
                        Js::Arr(out)
                    }
                    _ => Js::Arr(vec![]),
                }),
                "map" => Ok(match scoped {
                    Js::Arr(items) => Js::Arr(
                        items
                            .iter()
                            .map(|item| apply(&rule, item))
                            .collect::<Result<Vec<_>>>()?,
                    ),
                    _ => Js::Arr(vec![]),
                }),
                _ => {
                    let items = match scoped {
                        Js::Arr(items) if !items.is_empty() => items,
                        _ => return Ok(Js::Bool(op == "none")),
                    };
                    let stop_on = op != "all";
                    for item in &items {
                        if truthy(&apply(&rule, item)?) == stop_on {
                            return Ok(Js::Bool(op == "some"));
                        }
                    }
                    Ok(Js::Bool(op != "some"))
                }
            }
        }
        "reduce" => {
            let scoped = apply(&arg(&values, 0), data)?;
            let rule = arg(&values, 1);
            let initial = if values.len() > 2 {
                apply(&values[2], data)?
            } else {
                Js::Null
            };
            let items = match scoped {
                Js::Arr(items) => items,
                _ => return Ok(initial),
            };
            let mut accumulator = initial;
            for item in items {
                let scope = Js::Obj(vec![
                    ("current".to_string(), item),
                    ("accumulator".to_string(), accumulator),
                ]);
                accumulator = apply(&rule, &scope)?;
            }
            Ok(accumulator)
        }
        _ => {
            let args = values
                .iter()
                .map(|value| apply(value, data))
                .collect::<Result<Vec<_>>>()?;
            let (a, b, c) = (arg(&args, 0), arg(&args, 1), arg(&args, 2));
            match op.as_str() {
                "var" => Ok(var(data, &args)),
                "missing" => missing(data, &args),
                "missing_some" => missing_some(data, &args),
                "==" => Ok(Js::Bool(loose_equals(&a, &b))),
                "===" => Ok(Js::Bool(strict_equals(&a, &b))),
                "!=" => Ok(Js::Bool(!loose_equals(&a, &b))),
                "!==" => Ok(Js::Bool(!strict_equals(&a, &b))),
                ">" => Ok(Js::Bool(less(&b, &a))),
                ">=" => Ok(Js::Bool(less_equal(&b, &a))),
                "<" => between(&a, &b, &c, false),
                "<=" => between(&a, &b, &c, true),
                "!!" => Ok(Js::Bool(truthy(&a))),
                "!" => Ok(Js::Bool(!truthy(&a))),
                "%" => Ok(modulo(&a, &b)),
                "log" => Ok(a),
                "in" => Ok(Js::Bool(contains(&a, &b))),
                "cat" => Ok(cat(&args)),
                "substr" => Ok(substr(&a, &b, &c)),
                "+" => Ok(plus(&args)),
                "*" => times(&args),
                "-" => Ok(minus(&a, &b)),
                "/" => Ok(divide(&a, &b)),
                "min" => Ok(extreme(&args, false)),
                "max" => Ok(extreme(&args, true)),
                "merge" => Ok(merge(&args)),
                _ => Err(JsonLogicError(format!("Unrecognized operation {op}"))),
            }
        }
    }
}

/// The variables a rule reads (`jsonLogic.uses_data`).
pub fn uses_data(logic: &Js) -> Vec<Js> {
    let mut out = Vec::new();
    if is_logic(logic) {
        if let Js::Obj(entries) = logic {
            let (op, raw) = &entries[0];
            let values: Vec<&Js> = match raw {
                Js::Arr(items) => items.iter().collect(),
                other => vec![other],
            };
            if op == "var" {
                out.push(values.first().copied().cloned().unwrap_or(Js::Undefined));
            } else {
                for value in values {
                    out.extend(uses_data(value));
                }
            }
        }
    }
    let mut unique: Vec<Js> = Vec::new();
    for item in out {
        if !unique.iter().any(|seen| strict_equals(&item, seen)) {
            unique.push(item);
        }
    }
    unique
}
