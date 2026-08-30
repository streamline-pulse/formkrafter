# 4 — Platform independence

> DPG Standard indicator 4. Every claim points at a file or a test.

## Summary

FormKrafter runs wherever JavaScript runs. It requires no account, no API key,
no hosted service and no specific backend, and it has no mandatory proprietary
dependency. Its output is JSON that any language can read.

## No dependency on a service

FormKrafter performs **no network request of its own**. It has no telemetry, no
analytics, no licence check and no phone-home. The only requests that leave a
page are the ones a form spec asks for — a select loading options from a URL the
integrator wrote — and they go to the integrator's endpoint, through a service
that can be replaced:

```ts
import { services, FetchDataSourceService } from '@streamline-pulse/formkrafter-core'

services.dataSourceService = new FetchDataSourceService({ credentials: 'include' })
```

Five injection points cover everything that touches the outside world — remote
options, option catalogs, file uploads, nested form sources and JavaScript
execution. Each has a default implementation built on `fetch`, and each can be
replaced with one that speaks to whatever the deployment actually has. See
[the services guide](https://formkrafter.com/guides/services/) and
[`packages/core/lib/services/`](../../packages/core/lib/services/).

## No dependency on a framework

The engine — specs, validation, rules — is
[`formkrafter-core`](../../packages/core), plain TypeScript with no DOM. It runs
in a browser, in Node and in Bun; the test suite exercises it outside a browser
on every commit.

The UI is built once as **standard Custom Elements v1**, so it works in plain
HTML with a `<script type="module">` and nothing else
([the HTML example](../../examples/html) is exactly that page). The React and
Vue packages are thin generated wrappers over those same elements, and React
Native gets a separate renderer that shares the engine and renders native
primitives.

| Target | Package | Requires |
|---|---|---|
| Plain HTML, any framework | `formkrafter-wc` | A browser with Custom Elements v1 |
| React | `formkrafter-react` | React |
| Vue 3 | `formkrafter-vue` | Vue |
| React Native, Expo | `formkrafter-react-native` | React Native |
| A backend | `formkrafter-core` | Node, Bun or a browser |

## No dependency on a licence

Every runtime dependency is permissive and OSI-approved — see the generated
[licence report](02-open-licence-report.md). Nothing in the tree is paid,
source-available, field-restricted or subject to a contributor agreement.

## No lock-in on the data

The two documents FormKrafter handles are plain JSON with a published schema.
Extraction is reading a file; migrating away needs no cooperation from this
project. See [6 — Mechanism for extracting data](06-data-extraction.md).

## Deployment

The packages are published to npm and can be vendored, mirrored or installed
from a private registry. The documentation site is a static build
([`docs/`](../../docs)) that can be hosted anywhere, and the CDN referenced in
the documentation is a convenience, never a requirement — every example that
uses it has an equivalent bundler path.

## Evidence

| Claim | Where |
|---|---|
| No telemetry, no phone-home | [7 — Privacy](07-privacy.md) |
| Every outbound call is behind a replaceable service | [`packages/core/lib/services/`](../../packages/core/lib/services/) |
| Engine runs with no DOM | [`packages/core/__tests__/`](../../packages/core/__tests__/) |
| Standard Custom Elements, no framework | [`examples/html/public/index.html`](../../examples/html/public/index.html) |
| Permissive dependencies only | [licence report](02-open-licence-report.md) |
