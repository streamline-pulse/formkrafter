# FormKrafter

[![CI](https://github.com/streamline-pulse/formkrafter/actions/workflows/ci.yml/badge.svg)](https://github.com/streamline-pulse/formkrafter/actions/workflows/ci.yml)
[![npm core](https://img.shields.io/npm/v/@streamline-pulse/formkrafter-core?label=core)](https://www.npmjs.com/package/@streamline-pulse/formkrafter-core)
[![npm wc](https://img.shields.io/npm/v/@streamline-pulse/formkrafter-wc?label=wc)](https://www.npmjs.com/package/@streamline-pulse/formkrafter-wc)
[![npm react](https://img.shields.io/npm/v/@streamline-pulse/formkrafter-react?label=react)](https://www.npmjs.com/package/@streamline-pulse/formkrafter-react)
[![npm vue](https://img.shields.io/npm/v/@streamline-pulse/formkrafter-vue?label=vue)](https://www.npmjs.com/package/@streamline-pulse/formkrafter-vue)
[![license](https://img.shields.io/npm/l/@streamline-pulse/formkrafter-core)](./LICENSE)

A framework-agnostic **drag & drop form builder** and **form renderer**, built once as Web Components and consumed natively from React, Vue, or plain HTML.

Forms are described by a portable JSON **spec** — the single contract shared by the builder (authoring), the renderer (filling), and your backend (revalidation).

```mermaid
flowchart LR
    subgraph packages
        core["@streamline-pulse/formkrafter-core<br/>specs · ops · validation · rules · services"]
        wc["@streamline-pulse/formkrafter-wc<br/>Stencil Web Components"]
        react["@streamline-pulse/formkrafter-react<br/>generated wrappers"]
        vue["@streamline-pulse/formkrafter-vue<br/>generated wrappers"]
    end
    core --> wc
    wc --> react
    wc --> vue
    react --> R[React / Next / TanStack apps]
    vue --> V[Vue / Nuxt apps]
    wc --> H[Plain HTML / any framework]
    core --> B[Node / Bun backends<br/>server-side revalidation]
```

## Packages

| Package | Role |
|---|---|
| [`formkrafter-core`](packages/core/README.md) | Pure TypeScript domain: `BrickSpec`, RFC 6902 mutation ops with undo/redo, JSON Schema validation (Ajv), a sandboxed rules engine, injectable services. Zero DOM, runs anywhere. |
| [`formkrafter-wc`](packages/wc/README.md) | The UI: `<fk-form-builder>` and `<fk-form-render>` plus 27 built-in bricks, theming tokens, i18n, drag & drop (Pragmatic DnD). |
| [`formkrafter-react`](packages/react/README.md) | React components generated from the Web Components at build time. |
| [`formkrafter-vue`](packages/vue/README.md) | Vue components generated the same way. |

## Quick taste

```tsx
import { FkFormBuilder, FkFormRender } from '@streamline-pulse/formkrafter-react'
import '@streamline-pulse/formkrafter-wc/styles.css'

<FkFormBuilder locales={['en', 'fr']} onSpecChange={(e) => save(e.detail.spec)} />
<FkFormRender  spec={spec} locale="fr" onFormSubmit={(e) => post(e.detail.data)} />
```

```ts
// and on the server, the exact same verdict:
import { validateFormData } from '@streamline-pulse/formkrafter-core'

const { valid, errors } = validateFormData(spec, req.body, 'fr')
```

## Highlights

- **One spec, everywhere** — copy/paste or download the JSON from the builder, render it anywhere, revalidate it server-side with identical rules and localized messages.
- **No `eval`** — the JS escape hatch (rules, computed options, custom validators) runs in a built-in AST sandbox: CSP-safe, no globals, no network, execution budget.
- **Theming by CSS tokens** — `--fk-*` custom properties with a built-in dark theme (`.dark` or `data-fk-theme="dark"`); restyle everything without touching JavaScript.
- **i18n on both axes** — the builder chrome ships in English and French (extensible), and form content (labels, error messages, options) supports per-locale values inside the spec.
- **Repeating data** — data grids with per-row validation, steppers and tabs with per-step validation, composite bricks (address, file upload with pluggable upload service).

## Repository layout

```
formkrafter/
├── packages/
│   ├── core/        TypeScript domain library (tsc)
│   ├── wc/          Stencil Web Components (+ dev playground)
│   ├── react/       generated React wrappers
│   └── vue/         generated Vue wrappers
├── examples/
│   └── tanstack-start/   full app: builder + preview, en/fr, dark mode
├── package.json     Bun workspaces + version catalog
└── .changeset/      release management
```

## Development

Requires [Bun](https://bun.sh).

```bash
bun install
bun run build     # builds core → wc (regenerates react/vue wrappers) → wrappers
bun run test      # core unit tests + wc headless component tests
bun run lint
```

Iterating on components:

```bash
cd packages/wc && bun run start     # dev playground on :3333 (www only, dist untouched)
bun run build                        # required before consumers see your changes
```

Running the example app:

```bash
cd examples/tanstack-start && bun run dev   # :3000
```

> After changing `packages/*`, run `bun run build` at the root **and restart** the example's dev server — Vite caches linked workspace modules.

## Governance

FormKrafter is published by **Streamline Pulse**, which holds the copyright
(MIT, see [LICENSE](LICENSE)) and controls the `@streamline-pulse` npm scope,
the `streamline-pulse/formkrafter` repository and the `formkrafter.com` domain
the documentation is served from.

**Who decides.** The Streamline Pulse maintainers review and merge every change.
There is no separate committer tier today: the maintainer team is the decision
body, and it is listed on the repository's
[contributors graph](https://github.com/streamline-pulse/formkrafter/graphs/contributors).

**Where decisions happen.** In the open, on this repository — issues for defects
and proposals, pull requests for the change itself. A change that alters public
behaviour carries a [changeset](.changeset) explaining it, and that text becomes
the published changelog entry. Nothing ships through a private channel.

**How to take part.** [CONTRIBUTING.md](CONTRIBUTING.md) covers the setup, the
checks a change must pass and how to propose one. Participation is governed by
the [Code of Conduct](CODE_OF_CONDUCT.md); vulnerabilities follow
[SECURITY.md](SECURITY.md).

**Releases.** Automated with Changesets from `main`: one release pull request
per batch, all five packages versioned together, published from CI
([release.yml](.github/workflows/release.yml)). Every published version is
reachable from npm and tagged in this repository.

**Forking.** The MIT licence grants the right to fork, redistribute and run
FormKrafter without asking, including for a public administration that needs to
keep control of its own deployment.
