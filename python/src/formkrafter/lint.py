"""Spec checks — `utils/lint-spec.ts` in the core: what silently breaks validation, on the client and the server."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

from formkrafter.spec import configs_of, iterate_bricks, truthy

SpecIssueCode = Literal[
    "validations-without-data-type",
    "input-without-key",
    "duplicate-key",
    "collection-without-children",
    "content-in-row",
]


@dataclass(frozen=True)
class SpecIssue:
    code: SpecIssueCode
    path: str
    message: str
    key: str | None = field(default=None)

    def to_dict(self) -> dict[str, Any]:
        """The issue as the core returns it (no `key` when the brick has none)."""
        out: dict[str, Any] = {"code": self.code, "path": self.path}
        if self.key is not None:
            out["key"] = self.key
        out["message"] = self.message
        return out


def lint_spec(spec: Any) -> list[SpecIssue]:
    """Issues of a spec: keyless inputs, untyped validations, duplicate keys, empty collections, content in a row."""
    issues: list[SpecIssue] = []
    seen: dict[str, str] = {}

    for brick, path in iterate_bricks(spec):
        key: Any = configs_of(brick).get("key")
        has_key = truthy(key)
        brick_type = brick.get("type")
        carries_data = brick_type in ("input", "collection")

        if carries_data:
            if not has_key:
                issues.append(
                    SpecIssue(
                        "input-without-key",
                        path,
                        f'{brick_type} brick "{brick.get("id")}" has no configs.key — '
                        "it carries no data and is skipped by validation",
                    )
                )
            elif not truthy(brick.get("dataType")) or brick.get("dataType") == "void":
                validations = brick.get("validations") or []
                if validations:
                    issues.append(
                        SpecIssue(
                            "validations-without-data-type",
                            path,
                            f'"{key}" declares {len(validations)} validation(s) but has no dataType — '
                            "they are silently skipped, on the client and on the server",
                            key,
                        )
                    )

        if has_key and carries_data:
            previous = seen.get(key)
            if previous:
                issues.append(
                    SpecIssue(
                        "duplicate-key",
                        path,
                        f'key "{key}" is used by two bricks ({previous} and {path}) — '
                        "their values collide in the form data",
                        key,
                    )
                )
            else:
                seen[key] = path

        if brick_type == "collection" and not brick.get("children"):
            issues.append(
                SpecIssue(
                    "collection-without-children",
                    path,
                    f'collection "{key if key is not None else brick.get("id")}" has no row template — '
                    "it can never produce data",
                    key,
                )
            )

        if brick_type == "panel" and brick.get("id") == "row":
            for index, child in enumerate(brick.get("children") or []):
                if not isinstance(child, dict) or child.get("type") != "output":
                    continue
                issues.append(
                    SpecIssue(
                        "content-in-row",
                        f"{path}.{index}",
                        f"{child.get('id')} brick in a row takes a column like a field and reads as a label "
                        "without one — place it above or below the row",
                    )
                )

    return issues


def validation_warnings(spec: Any) -> list[str]:
    """The lint messages that `validate_form_data` returns as warnings."""
    return [issue.message for issue in lint_spec(spec) if issue.code == "validations-without-data-type"]
