# Digital Public Good dossier

FormKrafter's submission to the
[Digital Public Goods Alliance](https://digitalpublicgoods.net) registry, one
page per indicator. Every claim points at a file, a test or a generated report
in this repository — never at an intention.

| # | Indicator | Page | Notes |
|---|---|---|---|
| 1 | Relevance to the SDGs | [01](01-sdg-relevance.md) | SDG 16 primary, SDG 9 secondary |
| 2 | Open licence | [02](02-open-licence-report.md) | Generated — `bun run licence:report` |
| 3 | Clear ownership | [03](03-clear-ownership.md) | |
| 4 | Platform independence | [04](04-platform-independence.md) | |
| 5 | Documentation | [05](05-documentation.md) | |
| 6 | Mechanism for extracting data | [06](06-data-extraction.md) | |
| 7 | Privacy and applicable laws | [07](07-privacy.md) | |
| 8 | Standards and best practices | [08](08-standards-and-best-practices.md) | |
| 9 | Do no harm by design | [09](09-do-no-harm.md) | 9b and 9c not applicable, and say why |

## Related

- [ADOPTERS.md](../../ADOPTERS.md) — production deployments, independent ones
  first.
- [Accessibility report](../govstack/accessibility-report.md) — generated from a
  real run of the automated gate.
- [GovStack UX/UI conformance](../govstack/ux-ui-conformance.md) — including
  three named gaps.
- [GovStack sandbox positioning](../govstack/sandbox-positioning.md).

## Regenerating the generated pages

```bash
bun run licence:report   # 02
bun run a11y:report      # the accessibility report
```

## Submission

The registry submission is produced from the DPGA's own form and kept here as
`submission.json` once filed, so the version submitted stays under review with
everything else.
