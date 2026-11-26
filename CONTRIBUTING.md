# Contributing to FormKrafter

FormKrafter is MIT-licensed and developed in the open at
[streamline-pulse/formkrafter](https://github.com/streamline-pulse/formkrafter).
Bug reports, fixes, bricks and documentation are all welcome.

## Getting set up

The repository is a [Bun](https://bun.sh) workspace. Bun is the only
prerequisite; the version used in CI is pinned in
[`.github/workflows/ci.yml`](.github/workflows/ci.yml).

```bash
bun install
bun run build        # all five packages, in dependency order
bun test             # unit tests
bun run lint         # eslint over the whole repo
```

End-to-end tests drive real browsers and need Chromium once:

```bash
cd e2e && bun run install:browsers && cd ..
bun run e2e
```

`bun run e2e` starts the example applications itself — there is nothing to
launch by hand.

## Repository layout

| Path | What lives there |
|---|---|
| `packages/core` | Specs, validation, rules, services. No DOM. |
| `packages/wc` | The UI as Stencil Web Components. |
| `packages/react`, `packages/vue` | Wrappers **generated** from `wc` — never edit by hand. |
| `packages/react-native` | The native renderer, written by hand. |
| `python` | Server-side validation in Python, at parity with `packages/core`. |
| `rust` | Server-side validation in Rust, at parity with `packages/core`. |
| `python/tests/parity` | The parity fixtures both ports test against, written by the core. |
| `scripts` | Release, size, smoke and parity tooling. |
| `e2e` | Playwright tests and fixtures. |
| `docs` | The documentation site (Astro + Starlight). |

## Server ports

`python/` and `rust/` reproduce what `validateFormData`, `buildValidationSchema`
and `lintSpec` do, so a backend reaches the browser's verdict. Both follow the
same layout, one module per concern with the same name in each language:

| Concern | Core (`packages/core/lib`) | Python (`python/src/formkrafter`) | Rust (`rust/src`) |
|---|---|---|---|
| Form data validation | `validators/validator.ts` | `validate.py` | `validate.rs` |
| Validation schema, spec walking | `utils/brick-spec.ts` | `spec.py` | `spec.rs` |
| Spec lint | `utils/lint-spec.ts` | `lint.py` | `lint.rs` |
| Default messages | `validators/default-messages.ts` | `messages.py` | `messages.rs` |
| Rules and hidden fields | `brick/utils.ts`, `validators/validator.ts` | `rules.py` | `rules.rs` |
| Identifiers, plates, MRZ | `utils/identity.ts`, `utils/registries.ts`, `utils/mrz.ts` | `identity.py` | `identity.rs` |
| JsonLogic | `json-logic-js` | `jsonlogic.py` | `jsonlogic.rs` |
| JavaScript semantics | — | `_js.py` | `js.rs` |

Python also ships `models.py` (Pydantic specs) and `testing.py` (comparison with
the real core through Node); Rust has no counterpart yet.

A change to validation in the core lands in all three:

1. change the core and its tests;
2. regenerate the fixtures with `bun scripts/python-parity.ts` (it also updates
   `CORE_VERSION` in both ports), and add a case to
   `python/tests/parity/cases.json` when the behaviour is new;
3. port the change to `python/` and `rust/` in the twin modules;
4. run the checks of each port:

```bash
cd python && uv run ruff check src tests && uv run ruff format --check src tests && uv run mypy && uv run pytest
cd rust && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test
```

CI fails when the fixtures are stale or a port disagrees with them. The ports
are deliberately stricter than the browser in one place: a schema that does not
compile is refused (`SchemaInvalid`) instead of accepting every submission.
Record a port change in `python/CHANGELOG.md` or `rust/CHANGELOG.md`.

## Making a change

1. **Branch** from `main`.
2. **Write a test that fails without your change.** Unit tests live beside the
   package (`packages/*/__tests__`); anything that involves a browser belongs in
   `e2e/tests` with a fixture in `e2e/fixtures`.
3. **Run the checks** — `bun run build && bun test && bun run lint && bun run e2e`.
   CI runs the same set plus `bun run size` and `bun run smoke:pack`.
4. **Add a changeset** with `bun run changeset` for anything a consumer can
   observe. Pick `patch` for a fix, `minor` for a feature or a behaviour change
   — the packages share one version, so a changeset lists all of them.
5. **Open a pull request** describing what changes for someone using the
   library, not only what you edited.

### Commit messages

[Conventional Commits](https://www.conventionalcommits.org): `fix:`, `feat:`,
`docs:`, `chore:`, `refactor:`, `test:`. Say what changes and why the previous
behaviour was wrong; the body is where a reviewer learns what you found.

### Documentation

Any user-visible change updates `docs/` in **both** English and French — the two
trees are kept at parity. `bun run docs:build` fails on a broken internal link.

### Code style

`bun run lint` is the arbiter. Conventions it does not enforce:

- comments only where the code cannot say it (a non-obvious reason, an
  invariant, a browser or parity quirk, a security constraint), and always in
  English; prefer explaining a decision in the pull request;
- match the surrounding file rather than introducing a new idiom;
- commit messages and code are in English; user-facing text is localized.

## Adding a brick

A brick is registered, not hard-coded. `createBrick` in
[`packages/wc/src/registry/create-brick.tsx`](packages/wc/src/registry/create-brick.tsx)
is the entry point, and
[the bricks guide](https://formkrafter.com/guides/bricks/) walks through a
complete one. A brick that renders on the web should have a native counterpart
in `packages/react-native/lib/bricks`, or explicitly document that it is
web-only.

## Reporting a bug

Open an issue with the **form spec** and the **data** that reproduce it — those
two JSON documents are usually the whole reproduction. Say which package and
version, and which renderer (Web Components, React, Vue, React Native).

For anything with a security impact, follow [SECURITY.md](SECURITY.md) instead
of opening an issue.

## Licensing of contributions

Contributions are accepted under the project's own licence: by opening a pull
request you agree that your contribution is licensed under the
[MIT Licence](LICENSE), on the same terms as the rest of FormKrafter. There is
no separate contributor licence agreement to sign, and you keep the copyright to
what you wrote.

## Governance and conduct

Decisions and the release process are described in the
[Governance](README.md#governance) section of the README. Participation is
covered by the [Code of Conduct](CODE_OF_CONDUCT.md).
