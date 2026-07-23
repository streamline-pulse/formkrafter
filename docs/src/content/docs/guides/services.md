---
title: Services
description: Dependency injection points — file uploads, remote options, auth, spec sources, JS execution.
---

`services` is FormKrafter's dependency-injection surface. Override a service once at app startup and every builder/renderer on the page uses it.

| Service | Default | Replace when… |
|---|---|---|
| `services.jsRunnerService` | AST sandbox | you need full JS in a trusted context |
| `services.dataSourceService` | `fetch` + per-URL/headers cache | auth, base URL, retry policy: `new FetchDataSourceService({ credentials: 'include', headers: { … } })` |
| `services.fileUploadService` | base64 data-URL | real uploads: `new UrlFileUploadService({ url, headers, credentials })` — multipart POST + `remove()` on delete; a brick-level `uploadUrl` config overrides the default URL |
| `services.specSourceService` | `fetch` the ref as a URL (`FetchSpecSourceService`, with `baseUrl`/headers/caching) | nested forms loaded from your own store: `fetchSpec(ref)` returns a `BrickSpec` |
| `services.optionSourceService` | `fetch` the ref as a URL (`FetchOptionSourceService`, same defaults) | shared option catalogs: a select with `optionsSource: "catalog"` and `optionsRef` resolves through `fetchOptions(ref)` — store a 500-entry list once, reference it from every form |

## File uploads

```ts
import { services, UrlFileUploadService } from '@streamline-pulse/formkrafter-core'

services.fileUploadService = new UrlFileUploadService({
  url: '/api/uploads',
  credentials: 'include',
})
```

The file brick POSTs each file as multipart, reads the stored URL from the response (`url`/`path`/`location`/`href`), and calls `remove()` when the user deletes a file. `multiple: true` switches the brick to a multi-file card list.

## Remote options & auth

A select can load its options from a URL with `{key}` interpolation against the form data:

```
/api/employees?dept={department}
Authorization: Bearer {_authToken}
```

Two auth patterns, composable:

1. **httpOnly cookie** (recommended, same-origin): `services.dataSourceService = new FetchDataSourceService({ credentials: 'include' })` — nothing secret in specs or panel.
2. **Context token**: the host injects `data={{ _authToken }}` on the renderer. Underscore-prefixed keys are available internally (interpolation, rules) but **excluded from every emitted payload**.

## A page-wide singleton — by design

`services` lives on `globalThis` under `Symbol.for("formkrafter.core.services")`. Bundlers routinely end up with several copies of a module in one app (your bundle imports core directly, the Web Components bundle embeds its own) — the shared store guarantees that an override from your app is seen by the components, whichever copy executes it. The brick registry and the chrome translations use the same pattern.
