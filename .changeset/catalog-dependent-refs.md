---
"@streamline-pulse/formkrafter-core": minor
"@streamline-pulse/formkrafter-wc": minor
---

Catalog option lists: dependent refs and catalog suggestions.

- `optionsRef` is interpolated with the form answers like `optionsUrl` (`towns?region={region}`), and the list reloads when the answer changes: a town list can follow the selected region.
- `OptionSourceService.listCatalogs()` (optional) lists the catalogs a host offers; `FetchOptionSourceService` reads them from `catalogsUrl` (default `baseUrl`), as an array or `{ data: [...] }` of `{ ref | value, name | label, description?, filters? }`.
- The property panel suggests these refs for `optionsSource: "catalog"` (free text stays possible, for filters).
