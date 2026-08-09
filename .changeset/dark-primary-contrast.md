---
'@streamline-pulse/formkrafter-wc': patch
'@streamline-pulse/formkrafter-react-native': patch
---

Text on primary-colored buttons now uses the surface token instead of
hardcoded white: on the dark theme the primary is a light teal and white
text sat at 2.4:1 — the surface color reads at 7.3:1 dark and keeps the
exact same look in light. Found by extending the axe scan to the dark
scheme, which now runs in CI.
