# GovStack sandbox — where FormKrafter fits

## Summary

FormKrafter is a form **builder and renderer**, not a building block in its own
right. It fills a gap two GovStack building blocks leave open: the Registration
BB defines how registries behave but ships no form editor, and the Workflow BB
defines human tasks but not the interface a person completes them through.

It is proposed as reference software for the **UX/UI** building block's form
patterns, and as an implementation component for **Registration** and
**Workflow**.

## Registration BB — the missing editor

A registration process is a form: eligibility questions, applicant details,
supporting documents, a decision. The Registration BB specifies the data and the
services around it, and leaves the authoring of that form to each
implementation, which usually means hard-coding it.

FormKrafter provides:

- **A drag-and-drop editor** producing a portable JSON document, so a registry
  operator can change an eligibility question without a release cycle.
- **One document for three jobs** — authoring, rendering, and server-side
  validation of the submission. What the applicant was asked and what was
  accepted cannot drift apart.
- **A published schema** for that document
  ([`form-spec.schema.json`](../../packages/core/schema/form-spec.schema.json)),
  so another implementation can read or generate specs without this library.

## Workflow BB — the human task interface

A workflow's human tasks need a form, and the form usually differs per task and
per version of the process. FormKrafter renders it from a spec stored alongside
the process definition, on the web and on mobile, with the same validation rules
enforced again on the server.

## Evidence: a running integration

The Streamline Pulse suite, which is aligned with the GovStack Workflow Building
Block, uses FormKrafter across the whole citizen-to-institution path. Each of
these is a production deployment, listed in [ADOPTERS.md](../../ADOPTERS.md):

| Product | Role | FormKrafter's part |
|---|---|---|
| **Pulse API** | Process and task services | Stores the spec configuring each step, and revalidates every submission with `validateFormData` before accepting it |
| **Pulse Portal** | Citizen-facing | Renders the form an applicant fills in |
| **Pulse Desk** | Back office | Renders the same form for the processing agent, and in read-only review mode for a submitted file |
| **Pulse Insight** | Data collection | Authoring with the builder, filling with the renderer, revalidation on the server |

Two details are worth naming because they are what a sandbox integration
actually needs:

- **Prefill between steps.** A task's settings carry a `prefillMapping` that
  seeds the form from data already collected earlier in the process
  (`build_prefill.ts` in Pulse API), so an applicant is not asked twice for the
  same fact.
- **Server-side revalidation as a gate.** Submissions are revalidated against
  the stored spec before they are accepted
  (`submission_form_validation_service.ts`), which is the property that makes a
  browser-rendered form safe to build a procedure on.

Those repositories are private, so the paths above cannot be linked publicly;
each product's dependency on the published packages is declared in its own
manifest.

## Proposed Building Block Software entry

For the software page on govstack.global:

| Field | Value |
|---|---|
| Name | FormKrafter |
| Description | Framework-agnostic form builder and renderer. One portable JSON spec drives authoring, rendering on web and mobile, and server-side validation. |
| Licence | MIT |
| Source | https://github.com/streamline-pulse/formkrafter |
| Documentation | https://formkrafter.com |
| Building blocks | UX/UI (form patterns), Registration, Workflow |
| Maturity | Published on npm, used in production — see [ADOPTERS.md](../../ADOPTERS.md) |
| Standards | Custom Elements v1, JSON Schema 2020-12, JSON Patch (RFC 6902), WCAG 2.1 AA enforced in CI |

## What this proposal does not claim

FormKrafter implements no GovStack API and passes no compliance harness, because
the UX/UI building block defines neither. It is a component, offered as a
reference implementation of the form patterns that block describes — see the
[conformance note](ux-ui-conformance.md), which names three gaps rather than
hiding them.
