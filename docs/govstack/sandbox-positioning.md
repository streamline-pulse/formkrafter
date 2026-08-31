# FormKrafter and GovStack

This page previously proposed FormKrafter as reference software for a GovStack
UX/UI building block, and as an implementation component for the Registration
and Workflow building blocks. **That proposal was withdrawn: it rested on a
reading of GovStack that does not hold.**

Two things settle it, both from GovStack's own specification:

- A building block is a software module that **exposes or consumes APIs**. The
  specification states that "the building block specification scope is
  technical, not the implementation of a specific user interface" — user
  interfaces are explicitly out of scope.
- **There is no UX/UI building block.** The published set does not include one.
  GovStack's user-interface material — accessibility and responsive interface
  guidelines, common screen flows, client-side validation patterns — is service
  design guidance, offered as "guidance for building user-centered services,
  not as UI component requirements".

FormKrafter exposes no API and is a client-side library, so it is not an
implementation of any GovStack building block, and this project makes no such
claim.

The audit that was written alongside the withdrawn proposal is unaffected by
this and remains useful on its own terms: it is a real accessibility and UX
audit, with evidence for each claim and its gaps named. See
[the accessibility and UX audit](ux-ui-conformance.md) and the generated
[accessibility report](accessibility-report.md).

References: [GovStack building blocks](https://govstack.global/building-blocks/),
[building block specifications](https://specs.govstack.global/technical-specifications/building-blocks.md).
