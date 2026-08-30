# 5 — Documentation

> DPG Standard indicator 5.

## Where the documentation is

A dedicated site, [formkrafter.com](https://formkrafter.com), built from
[`docs/`](../../docs) (Astro + Starlight) and published from this repository.
It is written in **English and French**, kept at parity: the two trees hold the
same pages with the same structure.

The build fails on a broken internal link or a broken heading anchor
([`starlight-links-validator`](../../docs/astro.config.mjs)), so a documented
path that no longer exists breaks the build rather than misleading a reader.

## What it covers

| Area | Page |
|---|---|
| Installation and first form | [Getting started](https://formkrafter.com/getting-started/) |
| The spec document, its shape and immutable operations | [Form specs](https://formkrafter.com/guides/form-specs/) |
| Every built-in brick and how to write your own | [Bricks](https://formkrafter.com/guides/bricks/) |
| Validation, and reproducing the verdict server-side | [Validation](https://formkrafter.com/guides/validation/) |
| Conditional logic and the sandbox it runs in | [Rules](https://formkrafter.com/guides/rules/) |
| The five injection points for anything touching the network | [Services](https://formkrafter.com/guides/services/) |
| Forms that reference other forms | [Nested forms](https://formkrafter.com/guides/nested-forms/) |
| Theming | [Theming](https://formkrafter.com/guides/theming/) |
| Localised content and interface | [i18n](https://formkrafter.com/guides/i18n/) |
| The native renderer | [React Native](https://formkrafter.com/guides/react-native/) |
| Migrating from Form.io | [Form.io migration](https://formkrafter.com/guides/formio-migration/) |
| Props, events and methods | [Components reference](https://formkrafter.com/reference/components/) |
| What each package exports | [Packages reference](https://formkrafter.com/reference/packages/) |
| A running builder and renderer | [Demo](https://formkrafter.com/demo/) |

## The machine-readable specification

The form spec has a published **JSON Schema**, draft 2020-12:

- [`packages/core/schema/form-spec.schema.json`](../../packages/core/schema/form-spec.schema.json)
- Shipped in the package as
  `@streamline-pulse/formkrafter-core/schema/form-spec.schema.json`

It is kept in step with the implementation by tests rather than by discipline
([`form-spec-schema.test.ts`](../../packages/core/__tests__/form-spec-schema.test.ts)):
its enumerations are compared against the TypeScript unions they mirror, so
adding a validator or a brick type without updating the schema fails the build.

## Runnable examples

Four applications in [`examples/`](../../examples), each a working deployment
rather than a snippet: plain HTML from a CDN with no build step, TanStack Start
(React), Vue 3, and Expo (React Native). They are exercised by the end-to-end
suite on every commit, so an example that stops working fails CI.

## Contributor documentation

[`CONTRIBUTING.md`](../../CONTRIBUTING.md) describes the layout, the checks and
the release process; [the README](../../README.md) covers the architecture and
governance.
