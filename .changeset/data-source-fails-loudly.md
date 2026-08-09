---
'@streamline-pulse/formkrafter-core': patch
---

FetchDataSourceService now throws when a data source returns a non-array
payload instead of silently coercing it to an empty list — an API error
notice used to hide behind an empty select.
