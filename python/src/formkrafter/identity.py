"""Identifiers — `utils/identity.ts`, `utils/registries.ts` and `utils/mrz.ts` in the core.

National numbers, tax numbers and IBAN with their published keys, vehicle plates and company registry
numbers per format, and the machine-readable zone of travel documents (ICAO 9303) with its check digits.
"""

from __future__ import annotations

import re
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import date
from typing import Any, Literal

from formkrafter._js import JS_WHITESPACE, js_trim

_SEPARATORS = re.compile(f"[{JS_WHITESPACE}.-]")
_WHITESPACE = re.compile(f"[{JS_WHITESPACE}]+")


def _compact(value: str) -> str:
    """Spaces, dots and dashes dropped, upper case: what the checks read."""
    return _SEPARATORS.sub("", value).upper()


def _full(pattern: str) -> Callable[[str], bool]:
    compiled = re.compile(pattern)
    return lambda value: compiled.fullmatch(value) is not None


# --- national and tax identifiers ---------------------------------------------------------------

_FR_NIR = _full(r"[12][0-9]{2}(0[1-9]|1[0-2]|[2-9][0-9])(2A|2B|[0-9]{2})[0-9]{6}[0-9]{2}")


def check_fr_nir(value: str) -> bool:
    """French social security number: 13 digits and a 97-modulo key, Corsica (2A, 2B) included."""
    raw = _compact(value)
    if not _FR_NIR(raw):
        return False
    number = raw[:13].replace("2A", "19", 1).replace("2B", "18", 1)
    return int(raw[13:]) == 97 - int(number) % 97


def check_bj_npi(value: str) -> bool:
    """Benin personal identification number: 10 digits."""
    return re.fullmatch(r"[0-9]{10}", _compact(value)) is not None


def check_digits(value: str, length: int) -> bool:
    """Exactly `length` digits, for registries without a public key."""
    return re.fullmatch(f"[0-9]{{{length}}}", _compact(value)) is not None


def check_luhn(digits: str) -> bool:
    """Luhn checksum over a string of digits (SIREN, SIRET, card numbers)."""
    if re.fullmatch(r"[0-9]+", digits) is None:
        return False
    total = 0
    for i, char in enumerate(reversed(digits)):
        n = int(char)
        if i % 2 == 1:
            n *= 2
            if n > 9:
                n -= 9
        total += n
    return total % 10 == 0


def check_fr_siren(value: str) -> bool:
    """French company number: 9 digits with a Luhn key."""
    raw = _compact(value)
    return re.fullmatch(r"[0-9]{9}", raw) is not None and check_luhn(raw)


def check_fr_siret(value: str) -> bool:
    """French establishment number: 14 digits with a Luhn key."""
    raw = _compact(value)
    return re.fullmatch(r"[0-9]{14}", raw) is not None and check_luhn(raw)


def check_bj_ifu(value: str) -> bool:
    """Benin tax identifier (IFU): 13 digits."""
    return re.fullmatch(r"[0-9]{13}", _compact(value)) is not None


def check_iban(value: str) -> bool:
    """IBAN: country code, two check digits, 11 to 30 alphanumerics, ISO 7064 mod 97-10."""
    raw = _compact(value)
    if re.fullmatch(r"[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}", raw) is None:
        return False
    rearranged = raw[4:] + raw[:4]
    numeric = "".join(str(ord(c) - 55) if "A" <= c <= "Z" else c for c in rearranged)
    return int(numeric) % 97 == 1


def format_iban(value: str) -> str:
    """An IBAN grouped by four characters for display."""
    raw = _compact(value)
    return " ".join(raw[i : i + 4] for i in range(0, len(raw), 4))


_IDENTITY_CHECKS: dict[str, Callable[[str], bool]] = {
    "fr-nir": check_fr_nir,
    "bj-npi": check_bj_npi,
    "fr-siren": check_fr_siren,
    "fr-siret": check_fr_siret,
    "bj-ifu": check_bj_ifu,
    "iban": check_iban,
}
_DIGITS_FORMAT = re.compile(r"digits-([0-9]{1,3})")


def check_identity(format: str, value: str) -> bool:
    """True when `value` satisfies `format`; unknown formats accept any non-empty value."""
    check = _IDENTITY_CHECKS.get(format)
    if check:
        return check(value)
    digits = _DIGITS_FORMAT.fullmatch(format)
    if digits:
        return check_digits(value, int(digits.group(1)))
    return len(js_trim(value)) > 0


IDENTITY_FORMATS: list[dict[str, str]] = [
    {"id": "fr-nir", "label": "France · NIR (sécurité sociale)"},
    {"id": "bj-npi", "label": "Bénin · NPI"},
    {"id": "fr-siren", "label": "France · SIREN"},
    {"id": "fr-siret", "label": "France · SIRET"},
    {"id": "bj-ifu", "label": "Bénin · IFU"},
    {"id": "iban", "label": "IBAN"},
    {"id": "digits-10", "label": "10 chiffres"},
    {"id": "digits-13", "label": "13 chiffres"},
]


# --- vehicle plates and company registries -------------------------------------------------------


@dataclass(frozen=True)
class RegistryFormat:
    id: str
    label: str
    test: Callable[[str], bool] = field(repr=False)
    display: Callable[[str], str] | None = field(default=None, repr=False)


def _regroup(pattern: str, template: str) -> Callable[[str], str]:
    compiled = re.compile(pattern)
    return lambda value: compiled.sub(template, value, count=1)


PLATE_FORMATS: list[RegistryFormat] = [
    RegistryFormat(
        "fr",
        "France · AA-123-AA",
        _full(r"[A-HJ-NP-Z]{2}[0-9]{3}[A-HJ-NP-Z]{2}"),
        _regroup(r"^([A-Z]{2})([0-9]{3})([A-Z]{2})$", r"\1-\2-\3"),
    ),
    RegistryFormat(
        "bj",
        "Bénin · AB 1234 RB",
        _full(r"[A-Z]{1,2}[0-9]{4}[A-Z]{2}"),
        _regroup(r"^([A-Z]{1,2})([0-9]{4})([A-Z]{2})$", r"\1 \2 \3"),
    ),
    RegistryFormat(
        "ci",
        "Côte d’Ivoire · 1234 AB 01",
        _full(r"[0-9]{4}[A-Z]{2}[0-9]{2}"),
        _regroup(r"^([0-9]{4})([A-Z]{2})([0-9]{2})$", r"\1 \2 \3"),
    ),
    RegistryFormat(
        "sn",
        "Sénégal · AA 123 AA",
        _full(r"[A-Z]{2}[0-9]{3,4}[A-Z]{1,2}"),
        _regroup(r"^([A-Z]{2})([0-9]{3,4})([A-Z]{1,2})$", r"\1 \2 \3"),
    ),
    RegistryFormat("generic", "Libre (4 à 10 lettres ou chiffres)", _full(r"[A-Z0-9]{4,10}")),
]


def _without_spaces(test: Callable[[str], bool]) -> Callable[[str], bool]:
    return lambda value: test(_WHITESPACE.sub("", value))


REGISTRY_FORMATS: list[RegistryFormat] = [
    # RCCM OHADA: RB/COT/01 B 1234 (country/city/year, category letter, number)
    RegistryFormat(
        "ohada-rccm",
        "OHADA · RCCM (RB/COT/01 B 1234)",
        _without_spaces(_full(r"[A-Z]{2}/[A-Z]{2,4}/[0-9]{2,4}[A-Z][0-9]{3,7}")),
        _regroup(r"^([A-Z]{2}/[A-Z]{2,4}/[0-9]{2,4})([A-Z])([0-9]{3,7})$", r"\1 \2 \3"),
    ),
    RegistryFormat(
        "fr-rcs",
        "France · RCS (SIREN + ville)",
        _without_spaces(_full(r"[0-9]{9}RCS[A-Z]{2,}")),
        _regroup(r"^([0-9]{3})([0-9]{3})([0-9]{3})RCS(.+)$", r"\1 \2 \3 RCS \4"),
    ),
    RegistryFormat("generic", "Libre (4 à 20 caractères)", _full(r"[A-Z0-9/-]{4,20}")),
]


def _find(formats: list[RegistryFormat], id: str) -> RegistryFormat | None:
    return next((f for f in formats if f.id == id), None)


def compact_plate(value: str) -> str:
    """The plate as stored: letters and digits only, upper case."""
    return _compact(value)


def check_plate(format: str, value: str) -> bool:
    rule = _find(PLATE_FORMATS, format) or _find(PLATE_FORMATS, "generic")
    assert rule is not None
    return rule.test(_compact(value))


def format_plate(format: str, value: str) -> str:
    rule = _find(PLATE_FORMATS, format)
    compacted = _compact(value)
    if rule and rule.display and rule.test(compacted):
        return rule.display(compacted)
    return js_trim(value).upper()


def _compact_registry(value: str) -> str:
    """Registry numbers keep their separators (`/`): only case and spaces are normalised."""
    return _WHITESPACE.sub("", value).upper()


def check_company_registry(format: str, value: str) -> bool:
    rule = _find(REGISTRY_FORMATS, format) or _find(REGISTRY_FORMATS, "generic")
    assert rule is not None
    return rule.test(_compact_registry(value))


def format_company_registry(format: str, value: str) -> str:
    rule = _find(REGISTRY_FORMATS, format)
    compacted = _compact_registry(value)
    if rule and rule.display and rule.test(compacted):
        return rule.display(compacted)
    return js_trim(value).upper()


# --- machine-readable zone (ICAO 9303) ----------------------------------------------------------


@dataclass(frozen=True)
class MrzResult:
    raw: str
    format: Literal["TD1", "TD3"]
    document_type: str
    issuing_country: str
    document_number: str
    nationality: str
    surname: str
    given_names: str
    birth_date: str | None
    sex: Literal["M", "F", "X"]
    expiry_date: str | None
    optional: str
    valid: bool
    errors: list[str]

    def to_dict(self) -> dict[str, Any]:
        """The result as the core's `parseMrz` returns it (and the mrz brick stores it)."""
        return {
            "raw": self.raw,
            "format": self.format,
            "documentType": self.document_type,
            "issuingCountry": self.issuing_country,
            "documentNumber": self.document_number,
            "nationality": self.nationality,
            "surname": self.surname,
            "givenNames": self.given_names,
            "birthDate": self.birth_date,
            "sex": self.sex,
            "expiryDate": self.expiry_date,
            "optional": self.optional,
            "valid": self.valid,
            "errors": list(self.errors),
        }


_WEIGHTS = (7, 3, 1)


def _char_value(char: str) -> int:
    if "0" <= char <= "9":
        return int(char)
    if "A" <= char <= "Z":
        return ord(char) - 55
    return 0


def mrz_check_digit(field: str) -> int:
    """ICAO 9303 check digit: weights 7-3-1, modulo 10."""
    return sum(_char_value(c) * _WEIGHTS[i % 3] for i, c in enumerate(field)) % 10


def _checks(field: str, digit: str) -> bool:
    return "0" <= digit <= "9" and mrz_check_digit(field) == int(digit)


def _clean(field: str) -> str:
    return _WHITESPACE.sub(" ", js_trim(field.replace("<", " ")))


def _names(field: str) -> tuple[str, str]:
    parts = field.split("<<")
    return _clean(parts[0]), _clean(parts[1] if len(parts) > 1 else "")


def _date(field: str, kind: str, today: date | None) -> str | None:
    if re.fullmatch(r"[0-9]{6}", field) is None:
        return None
    now = (today or date.today()).year
    year = now // 100 * 100 + int(field[:2])
    if kind == "birth" and year > now:
        year -= 100
    if kind == "expiry" and year < now - 20:
        year += 100
    return f"{year}-{field[2:4]}-{field[4:6]}"


def _sex(char: str) -> Literal["M", "F", "X"]:
    return "M" if char == "M" else "F" if char == "F" else "X"


def mrz_lines(text: str) -> list[str]:
    """Pasted text as MRZ lines: upper case, `<` filler, no spaces."""
    lines = (_WHITESPACE.sub("", line).upper() for line in re.split(r"\r?\n", text))
    return [line for line in lines if line]


def parse_mrz(text: str, today: date | None = None) -> MrzResult | None:
    """Read a TD3 (passport, 2 × 44) or TD1 (identity card, 3 × 30) zone and verify every check digit.

    None when the text is not a zone of either shape. `today` sets the century guess for dates.
    """
    lines = mrz_lines(text)
    if len(lines) == 2 and all(len(line) == 44 for line in lines):
        return _parse_td3(lines[0], lines[1], text, today)
    if len(lines) == 3 and all(len(line) == 30 for line in lines):
        return _parse_td1(lines[0], lines[1], lines[2], text, today)
    return None


def _parse_td3(l1: str, l2: str, raw: str, today: date | None) -> MrzResult:
    errors: list[str] = []
    document_number = l2[0:9]
    if not _checks(document_number, l2[9]):
        errors.append("documentNumber")
    birth = l2[13:19]
    if not _checks(birth, l2[19]):
        errors.append("birthDate")
    expiry = l2[21:27]
    if not _checks(expiry, l2[27]):
        errors.append("expiryDate")
    optional = l2[28:42]
    if optional.replace("<", "") and not _checks(optional, l2[42]):
        errors.append("optional")
    composite = l2[0:10] + l2[13:20] + l2[21:43]
    if not _checks(composite, l2[43]):
        errors.append("composite")
    surname, given = _names(l1[5:])
    return MrzResult(
        raw=raw,
        format="TD3",
        document_type=_clean(l1[0:2]),
        issuing_country=_clean(l1[2:5]),
        document_number=_clean(document_number),
        nationality=_clean(l2[10:13]),
        surname=surname,
        given_names=given,
        birth_date=_date(birth, "birth", today),
        sex=_sex(l2[20]),
        expiry_date=_date(expiry, "expiry", today),
        optional=_clean(optional),
        valid=not errors,
        errors=errors,
    )


def _parse_td1(l1: str, l2: str, l3: str, raw: str, today: date | None) -> MrzResult:
    errors: list[str] = []
    document_number = l1[5:14]
    if not _checks(document_number, l1[14]):
        errors.append("documentNumber")
    birth = l2[0:6]
    if not _checks(birth, l2[6]):
        errors.append("birthDate")
    expiry = l2[8:14]
    if not _checks(expiry, l2[14]):
        errors.append("expiryDate")
    composite = l1[5:30] + l2[0:7] + l2[8:15] + l2[18:29]
    if not _checks(composite, l2[29]):
        errors.append("composite")
    surname, given = _names(l3)
    return MrzResult(
        raw=raw,
        format="TD1",
        document_type=_clean(l1[0:2]),
        issuing_country=_clean(l1[2:5]),
        document_number=_clean(document_number),
        nationality=_clean(l2[15:18]),
        surname=surname,
        given_names=given,
        birth_date=_date(birth, "birth", today),
        sex=_sex(l2[7]),
        expiry_date=_date(expiry, "expiry", today),
        optional=_clean(l1[15:30] + l2[18:29]),
        valid=not errors,
        errors=errors,
    )
