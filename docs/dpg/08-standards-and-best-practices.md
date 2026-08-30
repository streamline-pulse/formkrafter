# 8 — Standards and best practices

> DPG Standard indicator 8.

## Open standards implemented

| Standard | Where it is used |
|---|---|
| **Custom Elements v1** (WHATWG HTML) | The UI is built once as standard custom elements; the React and Vue packages are thin wrappers over the same elements. |
| **Form-associated custom elements** (`ElementInternals`) | `fk-form-render` participates in a surrounding `<form>`, so a native `<button type="submit" form="…">` drives it and `checkValidity()` reports its state. Feature-checked, so it degrades where `ElementInternals` is absent. |
| **JSON Schema** (draft 2020-12) | The form spec is published as a schema, and validation compiles each spec to a JSON Schema evaluated with Ajv. |
| **JSON Patch** (RFC 6902) | Every builder edit emits forward and inverse patches, which is also what undo/redo replays. |
| **WCAG 2.1 level AA** | Enforced by an automated gate — see below. |
| **WAI-ARIA** | `aria-required`, `aria-invalid`, `aria-readonly`, `role="alert"` on error messages, `aria-current` on wizard steps. |
| **Semantic Versioning** | All five packages share one version, bumped together. |
| **Conventional Commits** | Required by [`CONTRIBUTING.md`](../../CONTRIBUTING.md). |
| **BCP 47 language tags** | Localised labels and messages are keyed by locale. |

## Accessibility

`@axe-core/playwright` runs the `wcag2a`, `wcag2aa`, `wcag21a` and `wcag21aa`
rule sets over five pages in both colour schemes, on every pull request, with a
budget of **zero violations**
([`e2e/tests/a11y.spec.ts`](../../e2e/tests/a11y.spec.ts)). The current result
and, importantly, what automated rules cannot establish, are recorded in the
[accessibility report](../govstack/accessibility-report.md).

## Engineering practices

**Continuous integration** ([`ci.yml`](../../.github/workflows/ci.yml)) runs on
every push and pull request: build, unit tests, ESLint, an ESM smoke test, a
packaging smoke test that installs the built tarballs into a scratch project, a
bundle-size budget, and the full end-to-end suite in a pinned Playwright
container.

**Testing.** Unit tests live beside each package; browser behaviour is covered
by Playwright end-to-end tests over the four example applications, including
visual regression and the accessibility gate.

**Releases.** Automated with [Changesets](../../.changeset): one release pull
request per batch, published from CI
([`release.yml`](../../.github/workflows/release.yml)). A CI gate fails the
release if the lockfile and the package versions disagree, after a defect where
published packages depended on stale sibling versions.

**Documentation as a build artefact.** The docs site fails to build on a broken
internal link, and is written in English and French at parity (15 pages each).

**Dependency hygiene.** Runtime dependencies are few and permissively licensed —
see the generated [licence report](02-open-licence-report.md).

## Security practices

- Rules are interpreted in an AST sandbox rather than with `eval`, which also
  makes the library usable under a strict Content Security Policy.
- A private vulnerability channel and an explicit scope
  ([`SECURITY.md`](../../SECURITY.md)).
- Server-side revalidation documented as a requirement, not a suggestion.

## Community practices

[`CONTRIBUTING.md`](../../CONTRIBUTING.md), [`CODE_OF_CONDUCT.md`](../../CODE_OF_CONDUCT.md)
(Contributor Covenant 2.1) and [`SECURITY.md`](../../SECURITY.md) are all
present, and the [Governance section](../../README.md#governance) records who
decides and where.
