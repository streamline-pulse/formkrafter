---
"@streamline-pulse/formkrafter-core": patch
---

Security: the `mrz` validation no longer trusts the stored `valid` flag alone. The value must carry its zone (`raw`) and the zone must read with matching check digits, so a submission forging `{ valid: true }` is rejected, including by backends running `validateFormData`. Values written by the renderers always carry `raw`, so honest data gets the same verdict.
