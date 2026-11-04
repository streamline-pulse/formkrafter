"""Default validation messages, per locale — `validators/default-messages.ts` in the core."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from formkrafter._js import to_string

_MESSAGES: dict[str, dict[str, str]] = {
    "en": {
        "required": "This field is required",
        "minLength": "Must be at least {value} characters",
        "maxLength": "Must be at most {value} characters",
        "min": "Must be at least {value}",
        "max": "Must be at most {value}",
        "pattern": "Invalid format",
        "minItems": "Select at least {value} item(s)",
        "maxItems": "Select at most {value} item(s)",
        "email": "Invalid email address",
        "url": "Invalid URL",
        "type": "Invalid value",
        "custom": "Invalid value",
        "identity": "Invalid identifier for this format",
        "iban": "Invalid IBAN",
        "dateRange": "The end before the start is not allowed",
        "mrz": "Machine-readable zone unreadable or inconsistent",
        "plate": "Invalid registration plate for this format",
        "registry": "Invalid registration number for this format",
    },
    "fr": {
        "required": "Ce champ est obligatoire",
        "minLength": "Minimum {value} caractères",
        "maxLength": "Maximum {value} caractères",
        "min": "Minimum {value}",
        "max": "Maximum {value}",
        "pattern": "Format invalide",
        "minItems": "Sélectionnez au moins {value} élément(s)",
        "maxItems": "Sélectionnez au plus {value} élément(s)",
        "email": "Adresse email invalide",
        "url": "URL invalide",
        "type": "Valeur invalide",
        "custom": "Valeur invalide",
        "identity": "Identifiant invalide pour ce format",
        "iban": "IBAN invalide",
        "dateRange": "La fin ne peut pas précéder le début",
        "mrz": "Zone de lecture illisible ou incohérente",
        "plate": "Immatriculation invalide pour ce format",
        "registry": "Numéro d’immatriculation invalide pour ce format",
    },
}


def register_validation_messages(locale: str, messages: Mapping[str, str]) -> None:
    """Add or override the default messages of a locale (`registerValidationMessages`).

    Register the same messages on the client, or the server and the browser word their errors differently.
    """
    _MESSAGES[locale] = {**_MESSAGES.get(locale, {}), **messages}


def default_validation_message(validator: str, locale: str | None = None, value: Any = None) -> str:
    """The default message of a validator, with `{value}` filled in; English when the locale has none."""
    pack = _MESSAGES.get("en" if locale is None else locale, _MESSAGES["en"])
    template = pack.get(validator)
    if template is None:
        template = _MESSAGES["en"].get(validator, "Invalid value")
    return template.replace("{value}", to_string(value), 1)
