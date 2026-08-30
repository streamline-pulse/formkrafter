# 1 — Relevance to the Sustainable Development Goals

> DPG Standard indicator 1.

## Primary: SDG 16 — Peace, justice and strong institutions

**Target 16.6, effective, accountable and transparent institutions**, and
**target 16.10, public access to information.**

Administrative procedures are forms. Applying for a document, declaring a
change of circumstance, filing a request: each is a structured exchange between
a person and an institution, and each is usually the point where a digitised
service either works or fails.

FormKrafter addresses that point directly, in ways that matter for public
institutions rather than only for developers:

- **A procedure can be changed by the people who own it.** A form is a JSON
  document edited in a drag-and-drop builder, not code. An administration can
  amend an eligibility question, add a step or fix a label without a release
  cycle and without a vendor.
- **The rules are auditable.** The document that renders the form is the same
  one that validates the submission, on the server. What a citizen was asked,
  and what was accepted, are recoverable from a file a non-programmer can read
  — see [6 — Mechanism for extracting data](06-data-extraction.md).
- **No lock-in on public records.** Specs and submissions are plain JSON with a
  published schema. An administration can migrate away without this project's
  cooperation, which is a precondition for a public body committing a service
  to any tool.
- **Accessibility is enforced, not promised.** A form a person cannot complete
  excludes them from the service behind it. WCAG 2.1 AA rules run on every
  commit with a zero-violation budget — see the
  [accessibility report](../govstack/accessibility-report.md).
- **Multilingual by construction.** Labels, validation messages and the builder
  interface are localisable per locale, which matters in states with more than
  one official language.

## Secondary: SDG 9 — Industry, innovation and infrastructure

**Target 9.c, access to information and communications technology.**

FormKrafter is infrastructure for digital public services rather than a service
itself:

- It runs on any stack — plain HTML, React, Vue, React Native — with no account,
  no API key and no hosted dependency
  ([4 — Platform independence](04-platform-independence.md)).
- It requires no server of its own, so a deployment can be sovereign: on a
  ministry's own hosting, in a national cloud, or offline behind a firewall.
- It is small enough to serve on constrained connections, and the mobile
  renderer targets the phones that are the primary — often only — access device
  in much of the world.

## Evidence of use

FormKrafter is used in production today, listed in
[`ADOPTERS.md`](../../ADOPTERS.md):

- **Independently**, by [YALA Events](https://yala.events), for event
  registration forms.
- **Across the Streamline Pulse suite**, whose products cover exactly the
  citizen-to-institution path described above: Pulse Portal renders the form an
  applicant fills in, Pulse Desk renders the same form for the agent processing
  the case, Pulse API validates the specs configuring each step of the
  procedure, and Pulse Insight provides dynamic data collection with
  server-side revalidation.

That suite is itself aligned with the GovStack Workflow Building Block. See
[the sandbox positioning note](../govstack/sandbox-positioning.md).

## What this project does not claim

FormKrafter is a form library. It does not deliver a public service by itself,
and it collects, stores and transmits nothing on its own account
([7 — Privacy](07-privacy.md)). Its contribution to the goals above is as a
component: it makes the form layer of a digital public service portable,
auditable, accessible and free to leave.
