"""Test helpers for backends: check that your specs compile and validate the same in Python and in the browser.

`assert_matches_core` runs the real core through Node, from your web project where
`@streamline-pulse/formkrafter-core` is installed, and compares it with this package.
"""

from __future__ import annotations

import json
import math
import shutil
import subprocess
from collections.abc import Iterable, Sequence
from pathlib import Path
from typing import Any

from formkrafter.lint import lint_spec
from formkrafter.spec import as_spec, build_validation_schema
from formkrafter.validate import validate_form_data

_COMPILE_FAILURE = "the validation schema failed to compile, so no rule was enforced: "

_SCRIPT = """
import { buildValidationSchema, lintSpec, validateFormData } from "@streamline-pulse/formkrafter-core";
let input = "";
for await (const chunk of process.stdin) input += chunk;
const { spec, samples, locales } = JSON.parse(input);
const out = {
  lint: lintSpec(spec),
  locales: locales.map((locale) => ({
    locale,
    schema: buildValidationSchema(spec, locale ?? undefined),
    results: samples.map((sample) => validateFormData(spec, sample, locale ?? undefined)),
  })),
};
process.stdout.write(JSON.stringify(out));
"""


def export_contract(spec: Any, locales: Iterable[str] = ("fr", "en")) -> dict[str, Any]:
    """The spec with the schema the server compiles per locale, for a web test that checks the browser agrees:
    `expect(buildValidationSchema(contract.spec, locale)).toEqual(contract.schemas[locale])`.
    """
    plain = as_spec(spec)
    return {
        "spec": plain,
        "schemas": {locale: as_json(build_validation_schema(plain, locale)) for locale in locales},
    }


def core_results(
    spec: Any,
    samples: Sequence[Any] = (),
    locales: Sequence[str | None] = ("fr",),
    *,
    node_project: str | Path,
    node: str = "node",
) -> dict[str, Any]:
    """What the core makes of the spec: lint issues, then per locale the schema and each sample's verdict."""
    executable = shutil.which(node)
    if executable is None:
        raise RuntimeError(f"{node!r} not found: the core runs in Node")
    payload = json.dumps({"spec": as_spec(spec), "samples": list(samples), "locales": list(locales)})
    run = subprocess.run(
        [executable, "--input-type=module", "-e", _SCRIPT],
        input=payload,
        capture_output=True,
        text=True,
        cwd=node_project,
        check=False,
    )
    if run.returncode != 0:
        raise RuntimeError(f"the core failed in {node_project}: {run.stderr.strip()}")
    result: dict[str, Any] = json.loads(run.stdout)
    return result


def compare_with_core(
    spec: Any,
    samples: Sequence[Any] = (),
    locales: Sequence[str | None] = ("fr",),
    *,
    node_project: str | Path,
    node: str = "node",
) -> list[str]:
    """The differences between the core and this package on the spec and samples; empty when they agree."""
    core = core_results(spec, samples, locales, node_project=node_project, node=node)
    differences: list[str] = []

    lint = [issue.to_dict() for issue in lint_spec(spec)]
    if lint != core["lint"]:
        differences.append(f"lint: core {core['lint']}, python {lint}")

    for expected in core["locales"]:
        locale = expected["locale"]
        schema = as_json(build_validation_schema(spec, locale))
        if schema != expected["schema"]:
            differences.append(f"schema [{locale}]: core {json.dumps(expected['schema'])}, python {json.dumps(schema)}")
        for sample, verdict in zip(samples, expected["results"], strict=True):
            result = validate_form_data(spec, sample, locale).to_dict()
            if without_compile_reason(result) != without_compile_reason(verdict):
                differences.append(f"verdict [{locale}] on {json.dumps(sample)}: core {verdict}, python {result}")
    return differences


def assert_matches_core(
    spec: Any,
    samples: Sequence[Any] = (),
    locales: Sequence[str | None] = ("fr",),
    *,
    node_project: str | Path,
    node: str = "node",
) -> None:
    """Fail with every difference when the core and this package disagree on the spec or a sample."""
    differences = compare_with_core(spec, samples, locales, node_project=node_project, node=node)
    if differences:
        raise AssertionError("FormKrafter core and Python disagree:\n- " + "\n- ".join(differences))


def as_json(value: Any) -> Any:
    """What `JSON.stringify` keeps of a value: NaN and infinities become null."""
    if isinstance(value, float) and not math.isfinite(value):
        return None
    if isinstance(value, dict):
        return {k: as_json(v) for k, v in value.items()}
    if isinstance(value, list):
        return [as_json(v) for v in value]
    return value


def without_compile_reason(result: dict[str, Any]) -> dict[str, Any]:
    """Ajv and Python word a compile failure differently: only the fact that it failed must match."""
    warnings = result.get("warnings")
    if not warnings:
        return result
    trimmed = [w[: len(_COMPILE_FAILURE)] if w.startswith(_COMPILE_FAILURE) else w for w in warnings]
    return {**result, "warnings": trimmed}
