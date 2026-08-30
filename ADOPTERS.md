# Adopters

Deployments running FormKrafter in production. Entries are grouped by whether
they are operated by Streamline Pulse, who publishes FormKrafter, or by someone
else — an evaluator should weigh the two differently.

To add yours, open a pull request. A name, what FormKrafter does for you, and a
link if the deployment is public is enough.

## Independent

| Organisation | What FormKrafter does | Link |
|---|---|---|
| **YALA Events** | Powers the registration form engine for event sign-ups. | [yala.events](https://yala.events) |

## Streamline Pulse

The Streamline Pulse suite is FormKrafter's original driver, and remains the
deployment that exercises it most broadly — the builder, both renderers and
server-side revalidation, across citizen-facing and back-office surfaces.

| Product | What FormKrafter does | Packages used |
|---|---|---|
| **Pulse Insight** | Dynamic data-collection forms: the builder for authoring, the renderer for filling, and server-side revalidation of every submission. | `core`, `react`, `wc` |
| **Pulse API** | Validates the form specs that configure each step of a business process. | `core` |
| **Pulse Portal** | Renders the forms a citizen or applicant fills in. | `core`, `react`, `wc` |
| **Pulse Desk** | Renders the same forms for the agents who process a case, including read-only review of a submitted file. | `core`, `react`, `wc` |

These are private repositories, so the dependency declarations cannot be linked
publicly; the packages listed are the ones each product's manifest declares.

## What this list is for

FormKrafter is a library: it has no telemetry and no licence check, so nobody —
including its authors — can enumerate its installations. This file exists so
that adoption is stated by the people who adopted it, rather than inferred from
download counts, which measure mirrors and scanners as much as they measure use.
