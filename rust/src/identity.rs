//! Identifiers — `utils/identity.ts`, `utils/registries.ts` and `utils/mrz.ts` in the core.
//!
//! National numbers, tax numbers and IBAN with their published keys, vehicle plates and company
//! registry numbers per format, and the machine-readable zone of travel documents (ICAO 9303)
//! with its check digits.

use std::sync::{LazyLock, OnceLock};

use regex::Regex;
use serde_json::{Map, Value};

use crate::js::js_trim;

fn separators() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"[\t\n\x0b\x0c\r \u{a0}\u{1680}\u{2000}-\u{200a}\u{2028}\u{2029}\u{202f}\u{205f}\u{3000}\u{feff}.\-]").unwrap())
}

fn whitespace() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"[\t\n\x0b\x0c\r \u{a0}\u{1680}\u{2000}-\u{200a}\u{2028}\u{2029}\u{202f}\u{205f}\u{3000}\u{feff}]+").unwrap())
}

/// Spaces, dots and dashes dropped, upper case: what the checks read.
fn compact(value: &str) -> String {
    separators().replace_all(value, "").to_uppercase()
}

fn full(pattern: &str) -> Regex {
    Regex::new(&format!("^(?:{pattern})$")).unwrap()
}

fn fullmatch(re: &Regex, value: &str) -> bool {
    re.is_match(value)
}

// --- national and tax identifiers ---------------------------------------------------------------

/// French social security number: 13 digits and a 97-modulo key, Corsica (2A, 2B) included.
pub fn check_fr_nir(value: &str) -> bool {
    static RE: OnceLock<Regex> = OnceLock::new();
    let format = RE.get_or_init(|| {
        full(r"[12][0-9]{2}(0[1-9]|1[0-2]|[2-9][0-9])(2A|2B|[0-9]{2})[0-9]{6}[0-9]{2}")
    });
    let raw = compact(value);
    if !fullmatch(format, &raw) {
        return false;
    }
    let number = raw[..13].replacen("2A", "19", 1).replacen("2B", "18", 1);
    let (Ok(number), Ok(key)) = (number.parse::<u64>(), raw[13..].parse::<u64>()) else {
        return false;
    };
    key == 97 - number % 97
}

/// Benin personal identification number: 10 digits.
pub fn check_bj_npi(value: &str) -> bool {
    static RE: OnceLock<Regex> = OnceLock::new();
    fullmatch(RE.get_or_init(|| full(r"[0-9]{10}")), &compact(value))
}

/// Exactly `length` digits, for registries without a public key.
pub fn check_digits(value: &str, length: usize) -> bool {
    let raw = compact(value);
    raw.len() == length && raw.bytes().all(|b| b.is_ascii_digit())
}

/// Luhn checksum over a string of digits (SIREN, SIRET, card numbers).
pub fn check_luhn(digits: &str) -> bool {
    if digits.is_empty() || !digits.bytes().all(|b| b.is_ascii_digit()) {
        return false;
    }
    let mut total = 0u32;
    for (i, char) in digits.chars().rev().enumerate() {
        let mut n = char.to_digit(10).expect("digits only");
        if i % 2 == 1 {
            n *= 2;
            if n > 9 {
                n -= 9;
            }
        }
        total += n;
    }
    total.is_multiple_of(10)
}

/// French company number: 9 digits with a Luhn key.
pub fn check_fr_siren(value: &str) -> bool {
    let raw = compact(value);
    raw.len() == 9 && raw.bytes().all(|b| b.is_ascii_digit()) && check_luhn(&raw)
}

/// French establishment number: 14 digits with a Luhn key.
pub fn check_fr_siret(value: &str) -> bool {
    let raw = compact(value);
    raw.len() == 14 && raw.bytes().all(|b| b.is_ascii_digit()) && check_luhn(&raw)
}

/// Benin tax identifier (IFU): 13 digits.
pub fn check_bj_ifu(value: &str) -> bool {
    let raw = compact(value);
    raw.len() == 13 && raw.bytes().all(|b| b.is_ascii_digit())
}

/// IBAN: country code, two check digits, 11 to 30 alphanumerics, ISO 7064 mod 97-10.
pub fn check_iban(value: &str) -> bool {
    static RE: OnceLock<Regex> = OnceLock::new();
    let format = RE.get_or_init(|| full(r"[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}"));
    let raw = compact(value);
    if !fullmatch(format, &raw) {
        return false;
    }
    let rearranged = format!("{}{}", &raw[4..], &raw[..4]);
    let mut remainder = 0u32;
    for c in rearranged.chars() {
        let digits = if c.is_ascii_uppercase() {
            (c as u32 - 55).to_string()
        } else {
            c.to_string()
        };
        for d in digits.bytes() {
            remainder = (remainder * 10 + u32::from(d - b'0')) % 97;
        }
    }
    remainder == 1
}

/// An IBAN grouped by four characters for display.
pub fn format_iban(value: &str) -> String {
    let raw = compact(value);
    raw.chars()
        .collect::<Vec<_>>()
        .chunks(4)
        .map(|chunk| chunk.iter().collect::<String>())
        .collect::<Vec<_>>()
        .join(" ")
}

/// True when `value` satisfies `format`; unknown formats accept any non-empty value.
pub fn check_identity(format: &str, value: &str) -> bool {
    match format {
        "fr-nir" => check_fr_nir(value),
        "bj-npi" => check_bj_npi(value),
        "fr-siren" => check_fr_siren(value),
        "fr-siret" => check_fr_siret(value),
        "bj-ifu" => check_bj_ifu(value),
        "iban" => check_iban(value),
        _ => {
            if let Some(digits) = format.strip_prefix("digits-") {
                if let Ok(length) = digits.parse::<usize>() {
                    return check_digits(value, length);
                }
            }
            !js_trim(value).is_empty()
        }
    }
}

pub fn identity_formats() -> &'static [(&'static str, &'static str)] {
    &[
        ("fr-nir", "France · NIR (sécurité sociale)"),
        ("bj-npi", "Bénin · NPI"),
        ("fr-siren", "France · SIREN"),
        ("fr-siret", "France · SIRET"),
        ("bj-ifu", "Bénin · IFU"),
        ("iban", "IBAN"),
        ("digits-10", "10 chiffres"),
        ("digits-13", "13 chiffres"),
    ]
}

// --- vehicle plates and company registries -------------------------------------------------------

pub struct RegistryFormat {
    pub id: &'static str,
    pub label: &'static str,
    test: Regex,
    display: Option<(Regex, &'static str)>,
}

fn plate_formats() -> &'static [RegistryFormat] {
    static FORMATS: LazyLock<Vec<RegistryFormat>> = LazyLock::new(|| {
        vec![
            RegistryFormat {
                id: "fr",
                label: "France · AA-123-AA",
                test: full(r"[A-HJ-NP-Z]{2}[0-9]{3}[A-HJ-NP-Z]{2}"),
                display: Some((
                    Regex::new(r"^([A-Z]{2})([0-9]{3})([A-Z]{2})$").unwrap(),
                    "$1-$2-$3",
                )),
            },
            RegistryFormat {
                id: "bj",
                label: "Bénin · AB 1234 RB",
                test: full(r"[A-Z]{1,2}[0-9]{4}[A-Z]{2}"),
                display: Some((
                    Regex::new(r"^([A-Z]{1,2})([0-9]{4})([A-Z]{2})$").unwrap(),
                    "$1 $2 $3",
                )),
            },
            RegistryFormat {
                id: "ci",
                label: "Côte d’Ivoire · 1234 AB 01",
                test: full(r"[0-9]{4}[A-Z]{2}[0-9]{2}"),
                display: Some((
                    Regex::new(r"^([0-9]{4})([A-Z]{2})([0-9]{2})$").unwrap(),
                    "$1 $2 $3",
                )),
            },
            RegistryFormat {
                id: "sn",
                label: "Sénégal · AA 123 AA",
                test: full(r"[A-Z]{2}[0-9]{3,4}[A-Z]{1,2}"),
                display: Some((
                    Regex::new(r"^([A-Z]{2})([0-9]{3,4})([A-Z]{1,2})$").unwrap(),
                    "$1 $2 $3",
                )),
            },
            RegistryFormat {
                id: "generic",
                label: "Libre (4 à 10 lettres ou chiffres)",
                test: full(r"[A-Z0-9]{4,10}"),
                display: None,
            },
        ]
    });
    &FORMATS
}

fn registry_formats() -> &'static [RegistryFormat] {
    static FORMATS: LazyLock<Vec<RegistryFormat>> = LazyLock::new(|| {
        vec![
            // RCCM OHADA: RB/COT/01 B 1234 (country/city/year, category letter, number)
            RegistryFormat {
                id: "ohada-rccm",
                label: "OHADA · RCCM (RB/COT/01 B 1234)",
                test: full(r"[A-Z]{2}/[A-Z]{2,4}/[0-9]{2,4}[A-Z][0-9]{3,7}"),
                display: Some((
                    Regex::new(r"^([A-Z]{2}/[A-Z]{2,4}/[0-9]{2,4})([A-Z])([0-9]{3,7})$").unwrap(),
                    "$1 $2 $3",
                )),
            },
            RegistryFormat {
                id: "fr-rcs",
                label: "France · RCS (SIREN + ville)",
                test: full(r"[0-9]{9}RCS[A-Z]{2,}"),
                display: Some((
                    Regex::new(r"^([0-9]{3})([0-9]{3})([0-9]{3})RCS(.+)$").unwrap(),
                    "$1 $2 $3 RCS $4",
                )),
            },
            RegistryFormat {
                id: "generic",
                label: "Libre (4 à 20 caractères)",
                test: full(r"[A-Z0-9/-]{4,20}"),
                display: None,
            },
        ]
    });
    &FORMATS
}

pub fn plate_format_ids() -> Vec<&'static str> {
    plate_formats().iter().map(|f| f.id).collect()
}

pub fn registry_format_ids() -> Vec<&'static str> {
    registry_formats().iter().map(|f| f.id).collect()
}

fn find<'a>(formats: &'a [RegistryFormat], id: &str) -> Option<&'a RegistryFormat> {
    formats.iter().find(|f| f.id == id)
}

/// The plate as stored: letters and digits only, upper case.
pub fn compact_plate(value: &str) -> String {
    compact(value)
}

pub fn check_plate(format: &str, value: &str) -> bool {
    let formats = plate_formats();
    let rule = find(formats, format).or_else(|| find(formats, "generic"));
    match rule {
        Some(rule) => rule.test.is_match(&compact(value)),
        None => false,
    }
}

pub fn format_plate(format: &str, value: &str) -> String {
    let rule = find(plate_formats(), format);
    let compacted = compact(value);
    if let Some(rule) = rule {
        if let Some((pattern, template)) = &rule.display {
            if rule.test.is_match(&compacted) {
                return pattern.replace(&compacted, *template).to_string();
            }
        }
    }
    js_trim(value).to_uppercase()
}

/// Registry numbers keep their separators (`/`): only case and spaces are normalised.
fn compact_registry(value: &str) -> String {
    whitespace().replace_all(value, "").to_uppercase()
}

pub fn check_company_registry(format: &str, value: &str) -> bool {
    let formats = registry_formats();
    let rule = find(formats, format).or_else(|| find(formats, "generic"));
    match rule {
        Some(rule) => rule.test.is_match(&compact_registry(value)),
        None => false,
    }
}

pub fn format_company_registry(format: &str, value: &str) -> String {
    let rule = find(registry_formats(), format);
    let compacted = compact_registry(value);
    if let Some(rule) = rule {
        if let Some((pattern, template)) = &rule.display {
            if rule.test.is_match(&compacted) {
                return pattern.replace(&compacted, *template).to_string();
            }
        }
    }
    js_trim(value).to_uppercase()
}

// --- machine-readable zone (ICAO 9303) ----------------------------------------------------------

#[derive(Clone, Debug)]
pub struct MrzResult {
    pub raw: String,
    pub format: &'static str,
    pub document_type: String,
    pub issuing_country: String,
    pub document_number: String,
    pub nationality: String,
    pub surname: String,
    pub given_names: String,
    pub birth_date: Option<String>,
    pub sex: &'static str,
    pub expiry_date: Option<String>,
    pub optional: String,
    pub valid: bool,
    pub errors: Vec<String>,
}

impl MrzResult {
    /// The result as the core's `parseMrz` returns it (and the mrz brick stores it).
    pub fn to_dict(&self) -> Value {
        let mut out = Map::new();
        out.insert("raw".to_string(), Value::String(self.raw.clone()));
        out.insert("format".to_string(), Value::String(self.format.to_string()));
        out.insert(
            "documentType".to_string(),
            Value::String(self.document_type.clone()),
        );
        out.insert(
            "issuingCountry".to_string(),
            Value::String(self.issuing_country.clone()),
        );
        out.insert(
            "documentNumber".to_string(),
            Value::String(self.document_number.clone()),
        );
        out.insert(
            "nationality".to_string(),
            Value::String(self.nationality.clone()),
        );
        out.insert("surname".to_string(), Value::String(self.surname.clone()));
        out.insert(
            "givenNames".to_string(),
            Value::String(self.given_names.clone()),
        );
        out.insert(
            "birthDate".to_string(),
            self.birth_date.clone().map_or(Value::Null, Value::String),
        );
        out.insert("sex".to_string(), Value::String(self.sex.to_string()));
        out.insert(
            "expiryDate".to_string(),
            self.expiry_date.clone().map_or(Value::Null, Value::String),
        );
        out.insert("optional".to_string(), Value::String(self.optional.clone()));
        out.insert("valid".to_string(), Value::Bool(self.valid));
        out.insert(
            "errors".to_string(),
            Value::Array(
                self.errors
                    .iter()
                    .map(|e| Value::String(e.clone()))
                    .collect(),
            ),
        );
        Value::Object(out)
    }
}

const WEIGHTS: [u32; 3] = [7, 3, 1];

fn char_value(c: char) -> u32 {
    match c {
        '0'..='9' => c as u32 - '0' as u32,
        'A'..='Z' => c as u32 - 55,
        _ => 0,
    }
}

/// ICAO 9303 check digit: weights 7-3-1, modulo 10.
pub fn mrz_check_digit(field: &str) -> u32 {
    field
        .chars()
        .enumerate()
        .map(|(i, c)| char_value(c) * WEIGHTS[i % 3])
        .sum::<u32>()
        % 10
}

fn checks(field: &str, digit: char) -> bool {
    digit.is_ascii_digit() && mrz_check_digit(field) == digit as u32 - '0' as u32
}

fn clean(field: &str) -> String {
    whitespace()
        .replace_all(js_trim(&field.replace('<', " ")), " ")
        .to_string()
}

fn names(field: &str) -> (String, String) {
    let mut parts = field.splitn(2, "<<");
    let surname = clean(parts.next().unwrap_or(""));
    let given = clean(parts.next().unwrap_or(""));
    (surname, given)
}

fn today_year() -> i64 {
    let days = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| (d.as_secs() / 86400) as i64)
        .unwrap_or(0);
    // days since 1970-01-01 -> civil year (Howard Hinnant's algorithm)
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146_096) / 365;
    let year = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    if month <= 2 {
        year + 1
    } else {
        year
    }
}

fn date(field: &str, kind: &str, today: Option<i64>) -> Option<String> {
    if field.len() != 6 || !field.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    let now = today.unwrap_or_else(today_year);
    let mut year = now / 100 * 100 + field[..2].parse::<i64>().ok()?;
    if kind == "birth" && year > now {
        year -= 100;
    }
    if kind == "expiry" && year < now - 20 {
        year += 100;
    }
    Some(format!("{year}-{}-{}", &field[2..4], &field[4..6]))
}

fn sex(char: char) -> &'static str {
    match char {
        'M' => "M",
        'F' => "F",
        _ => "X",
    }
}

/// Pasted text as MRZ lines: upper case, `<` filler, no spaces.
pub fn mrz_lines(text: &str) -> Vec<String> {
    text.lines()
        .map(|line| whitespace().replace_all(line, "").to_uppercase())
        .filter(|line| !line.is_empty())
        .collect()
}

/// Read a TD3 (passport, 2 × 44) or TD1 (identity card, 3 × 30) zone and verify every check digit.
///
/// None when the text is not a zone of either shape. `today` sets the century guess for dates.
pub fn parse_mrz(text: &str, today: Option<i64>) -> Option<MrzResult> {
    let lines = mrz_lines(text);
    if lines.len() == 2 && lines.iter().all(|line| line.chars().count() == 44) {
        return Some(parse_td3(&lines[0], &lines[1], text, today));
    }
    if lines.len() == 3 && lines.iter().all(|line| line.chars().count() == 30) {
        return Some(parse_td1(&lines[0], &lines[1], &lines[2], text, today));
    }
    None
}

/// Slice by character index, Python-style; MRZ lines are ASCII after cleaning, but stay safe.
fn at(text: &str, start: usize, end: usize) -> String {
    text.chars().skip(start).take(end - start).collect()
}

fn at_char(text: &str, index: usize) -> char {
    text.chars().nth(index).unwrap_or('\0')
}

fn parse_td3(l1: &str, l2: &str, raw: &str, today: Option<i64>) -> MrzResult {
    let mut errors = Vec::new();
    let document_number = at(l2, 0, 9);
    if !checks(&document_number, at_char(l2, 9)) {
        errors.push("documentNumber".to_string());
    }
    let birth = at(l2, 13, 19);
    if !checks(&birth, at_char(l2, 19)) {
        errors.push("birthDate".to_string());
    }
    let expiry = at(l2, 21, 27);
    if !checks(&expiry, at_char(l2, 27)) {
        errors.push("expiryDate".to_string());
    }
    let optional = at(l2, 28, 42);
    if !optional.replace('<', "").is_empty() && !checks(&optional, at_char(l2, 42)) {
        errors.push("optional".to_string());
    }
    let composite = format!("{}{}{}", at(l2, 0, 10), at(l2, 13, 20), at(l2, 21, 43));
    if !checks(&composite, at_char(l2, 43)) {
        errors.push("composite".to_string());
    }
    let (surname, given) = names(&at(l1, 5, l1.chars().count()));
    MrzResult {
        raw: raw.to_string(),
        format: "TD3",
        document_type: clean(&at(l1, 0, 2)),
        issuing_country: clean(&at(l1, 2, 5)),
        document_number: clean(&document_number),
        nationality: clean(&at(l2, 10, 13)),
        surname,
        given_names: given,
        birth_date: date(&birth, "birth", today),
        sex: sex(at_char(l2, 20)),
        expiry_date: date(&expiry, "expiry", today),
        optional: clean(&optional),
        valid: errors.is_empty(),
        errors,
    }
}

fn parse_td1(l1: &str, l2: &str, l3: &str, raw: &str, today: Option<i64>) -> MrzResult {
    let mut errors = Vec::new();
    let document_number = at(l1, 5, 14);
    if !checks(&document_number, at_char(l1, 14)) {
        errors.push("documentNumber".to_string());
    }
    let birth = at(l2, 0, 6);
    if !checks(&birth, at_char(l2, 6)) {
        errors.push("birthDate".to_string());
    }
    let expiry = at(l2, 8, 14);
    if !checks(&expiry, at_char(l2, 14)) {
        errors.push("expiryDate".to_string());
    }
    let composite = format!(
        "{}{}{}{}",
        at(l1, 5, 30),
        at(l2, 0, 7),
        at(l2, 8, 15),
        at(l2, 18, 29)
    );
    if !checks(&composite, at_char(l2, 29)) {
        errors.push("composite".to_string());
    }
    let (surname, given) = names(l3);
    MrzResult {
        raw: raw.to_string(),
        format: "TD1",
        document_type: clean(&at(l1, 0, 2)),
        issuing_country: clean(&at(l1, 2, 5)),
        document_number: clean(&document_number),
        nationality: clean(&at(l2, 15, 18)),
        surname,
        given_names: given,
        birth_date: date(&birth, "birth", today),
        sex: sex(at_char(l2, 7)),
        expiry_date: date(&expiry, "expiry", today),
        optional: clean(&format!("{}{}", at(l1, 15, 30), at(l2, 18, 29))),
        valid: errors.is_empty(),
        errors,
    }
}
