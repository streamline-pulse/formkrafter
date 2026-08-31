# GovStack UX/UI Building Block — conformance note

The GovStack UX/UI Building Block is a set of **guidelines**, not an API with a
compliance harness: there is nothing to certify against. This note therefore
documents, section by section, what FormKrafter does, with a link to the code or
the test that shows it — and states plainly where it falls short.

Status key: ✅ met, with evidence · 🟠 partial, with the gap named · ❌ not done.

| Section | Status |
|---|---|
| Accessibility (WCAG 2.1 AA) | ✅ |
| Multilingual | ✅ |
| Right-to-left | ✅ |
| Mobile-first, responsive | 🟠 |
| Form patterns | ✅ |
| Design system integration | ✅ |
| Usability testing | ❌ |

---

## Accessibility — WCAG 2.1 AA ✅

`@axe-core/playwright` runs the `wcag2a`, `wcag2aa`, `wcag21a` and `wcag21aa`
rule sets across five pages in both light and dark schemes, on every pull
request, with a **budget of zero violations**
([`e2e/tests/a11y.spec.ts`](../../e2e/tests/a11y.spec.ts)). Current result:
**8 scans, 0 violations**, axe-core 4.12.1 — see the
[accessibility report](accessibility-report.md), which is generated from a real
run rather than transcribed.

Beyond the automated gate, specific behaviours are covered by their own tests:

| Requirement | Evidence |
|---|---|
| Labels associated with controls | The shared field wrapper renders a `<label>` around the control ([`default-bricks.tsx`](../../packages/wc/src/registry/default-bricks.tsx)) |
| Required fields announced | `aria-required` plus a screen-reader-only "(required)" next to the visual asterisk ([`ergonomics.spec.ts`](../../e2e/tests/ergonomics.spec.ts)) |
| Errors announced | Error messages carry `role="alert"` |
| Invalid state exposed | `aria-invalid` on the offending control |
| Read-only state exposed | `aria-readonly`, with values that stay selectable and keyboard-reachable ([`readonly-collection.spec.ts`](../../e2e/tests/readonly-collection.spec.ts)) |
| Keyboard operation of the select | Full keyboard control, including Escape returning focus to the trigger ([`select-keyboard.spec.ts`](../../e2e/tests/select-keyboard.spec.ts)) |
| Target size ≥ 24 × 24 px | Enforced by [`responsive.spec.ts`](../../e2e/tests/responsive.spec.ts) |

**What this does not establish.** Automated rules cannot tell whether an error
message is understandable, or whether the builder's drag-and-drop has a keyboard
path a person would actually find. The report says so, and usability testing —
which would answer it — has not been carried out.

## Multilingual ✅

Two things are localisable, and they are independent:

- **Form content.** Any label, placeholder, option or validation message can be
  a plain string or an object keyed by locale. The renderer's `locale` prop
  re-resolves them without a remount, and entered data survives the switch
  ([`home-and-locale.spec.ts`](../../e2e/tests/home-and-locale.spec.ts)).
- **The interface itself.** The builder chrome and the built-in validation
  messages come from a replaceable translation store: 267 keys, English and
  French supplied ([`packages/core/lib/i18n.ts`](../../packages/core/lib/i18n.ts)),
  any other locale added with `setFkTranslations`.

Locale keys are ordinary BCP 47 tags. Nothing in the library restricts the set.

See [the i18n guide](https://formkrafter.com/guides/i18n/).

## Right-to-left ✅

Every stylesheet uses **logical properties** — `margin-inline`, `inset-inline`,
`border-inline-end`, `text-align: start|end`. No physical `left`/`right`
property remains in the component styles, so setting `dir="rtl"` on the document
mirrors the layout with no per-locale CSS.

Verified by [`rtl.spec.ts`](../../e2e/tests/rtl.spec.ts) against an Arabic form
covering text, textarea, select and a data grid:

- the direction reaches every rendered control;
- nothing overflows its container;
- the required marker keeps its logical position;
- **the layout mirrors** — each field sits the same distance from the *start*
  edge in LTR and in RTL, which is the assertion that actually catches a
  physical property. Verified falsifiable: adding a single `margin-left` fails
  it, where the direction check alone did not.

Not covered: RTL-specific typography and the bidirectional handling of mixed
Arabic and Latin content, which are the host page's responsibility.

## Mobile-first, responsive 🟠

**The renderer is verified at 360 × 640** — the small end of the phones that are
the primary, often only, access device for a public service. On every pull
request, for the wizard, the Vue example and the plain-HTML example
([`responsive.spec.ts`](../../e2e/tests/responsive.spec.ts)):

- the rendered form does not overflow its container;
- no control is wider than the viewport;
- every interactive control is at least 24 × 24 px.

That suite found real defects when it was introduced — grid controls, stepper
navigation, tabs and step labels were all 22 px high — which are now fixed and
kept fixed by the test.

**The gap: the builder is a desktop tool.** Palette, canvas and property panel
sit side by side, and it is not usable at 360 px. This is deliberate — a citizen
fills a form on a phone, an administrator authors one on a screen — but it means
"mobile-first" applies to the renderer only, and any deployment expecting
form *authoring* on a phone should treat this as unmet.

## Form patterns ✅

| Pattern | How |
|---|---|
| Inline validation | Errors appear as the user types, and only on fields already touched |
| Errors next to the field | Rendered inside the field wrapper, immediately after the control, with `role="alert"` |
| Multi-step forms with progress | The stepper brick, with per-step validation gates and clickable step labels |
| Conditional fields | Rules drive hidden, disabled, required and computed values from the data and the host's runtime context |
| Contextual help | Per-brick placeholder, prefix and suffix configuration |
| Repeating groups | The data-grid collection, with per-row validation |
| Save and resume | The renderer is controlled: its data is the host's, so persisting a partial submission and handing it back later is the host's ordinary state management |
| Review before submit | The recap brick summarises answers; read-only mode renders a submitted file with navigation intact |
| Local formats | Dates, numbers and phone numbers are per-brick configuration, not hard-coded |

## Design system integration ✅

Theming is **CSS custom properties** — colours, spacing, radius, typography —
overridable from the host page, with light and dark handled by the same tokens
([theming guide](https://formkrafter.com/guides/theming/)). The stylesheet is
opt-in and small (1.6 KB gzipped): a host that wants to style everything itself
can skip it and target the class names.

**Worked example: GOV.UK Frontend.**
[`e2e/fixtures/govuk-theme.html`](../../e2e/fixtures/govuk-theme.html) renders a
licence application styled with the GOV.UK Design System palette, typography
scale, square corners, 2px black borders, the yellow focus state and the green
submit button. The entire mapping is custom properties plus class-name styling
in the host page: **no brick is overridden and nothing is forked**, so a
government design system adopts the renderer without changing the library.

[`design-system.spec.ts`](../../e2e/tests/design-system.spec.ts) asserts that
the tokens reach the controls, that the focus state is the design system's and
not the default, that validation and submission still work under the theme, and
that the accessibility affordances survive it.

## Usability testing ❌

**None has been carried out.** No sessions, no protocol, no findings. Saying so
is more useful than describing an intention.

What would be worth running first, given what the automated gates already cover:
completing a multi-step form on a phone with a screen reader; recovering from a
validation error without external help; and an administrator authoring a
conditional field in the builder without documentation.

---

## Summary for an evaluator

FormKrafter enforces accessibility and small-screen behaviour on every commit
rather than asserting them, and the artefacts are regenerable
([`bun run a11y:report`](../../package.json)). Two gaps are real and named:
builder ergonomics on a phone, and the absence of usability testing. Neither is
hidden behind a green tick.
