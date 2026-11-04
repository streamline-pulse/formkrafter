"""Pydantic models of a spec (`pip install formkrafter[pydantic]`), for backends that build specs in code.

Every function of the package takes these models or plain dicts alike. The models are permissive:
unknown fields are kept, so a spec from a newer core still round-trips.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

LocalizedText = str | dict[str, str]
JSONSchemaType = Literal["string", "number", "integer", "boolean", "object", "array", "null", "void"]


class _Model(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)


class Validation(_Model):
    validator: str
    message: LocalizedText | None = None
    value: Any = None
    custom_validator: str | None = Field(default=None, alias="customValidator")


class EffectProperty(_Model):
    target: str
    type: Literal["logic", "code", "boolean", "string"]


class Effect(_Model):
    name: str | None = None
    property: EffectProperty | None = None
    logic: Any = None
    code: str | None = None
    boolean: bool | None = None
    string: str | None = None


class Rule(_Model):
    name: str
    type: Literal["jsonLogic", "javaScript"]
    logic: Any = None
    code: str | None = None
    effects: list[Effect] | None = None


class BrickSpec(_Model):
    type: Literal["panel", "input", "collection", "output", "action"]
    id: str
    name: str
    data_type: JSONSchemaType | list[JSONSchemaType] | None = Field(default=None, alias="dataType")
    category: str | None = None
    validations: list[Validation] | None = None
    rules: list[Rule] | None = None
    configs: dict[str, Any] | None = None
    styles: dict[str, Any] | None = None
    children: list[BrickSpec] | None = None

    def to_spec(self) -> dict[str, Any]:
        """The spec as JSON for the client: camelCase keys, unset fields left out."""
        return self.model_dump(by_alias=True, exclude_none=True)
