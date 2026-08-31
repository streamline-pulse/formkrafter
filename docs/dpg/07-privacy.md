# 7 — Privacy and applicable laws

> DPG Standard indicator 7.

## What FormKrafter is, for the purposes of data protection

FormKrafter is a **library**, not a service. It builds and renders forms inside
an application someone else operates. It has no server, no account, no tenant
and no database. Under the GDPR it is a tool used by a controller; it is not
itself a processor, because it never receives data on its own account.

Everything a person types stays in the memory of the page or the app that
rendered the form, and leaves only through code the integrating application
wrote.

## Verified properties

Each of these is a statement about the published packages, checkable in this
repository.

**No telemetry, no analytics, no phone-home.** The library reports nothing
anywhere. Two `fetch` call sites exist in the entire published surface:

| File | What it calls |
|---|---|
| [`packages/core/lib/services/data_source_service.ts`](../../packages/core/lib/services/data_source_service.ts) | The `optionsUrl` a form spec supplies, to load select options |
| [`packages/react-native/lib/file.tsx`](../../packages/react-native/lib/file.tsx) | The local `file://` URI of a document the user picked, to read its bytes |

File uploads go through `fileUploadService` to the `uploadUrl` the integrator
configured. There is no default endpoint anywhere in the code: the shipped
default turns a file into a base64 data URL and sends it nowhere.

**No storage.** The packages use no `localStorage`, no `sessionStorage`, no
IndexedDB and no cookies. Nothing persists across a page load unless the
application persists it.

**Every outbound call is replaceable.** The five services are injection points;
an integrator who must route traffic through their own gateway, add
authentication or block egress entirely replaces them at startup. See
[the services guide](https://formkrafter.com/guides/services/).

**No identifiers.** FormKrafter generates no device id, no session id and no
user id. The `uid` the builder uses is a per-session editing identifier, stripped
from everything it emits.

## What the integrator remains responsible for

FormKrafter cannot discharge these, and this dossier does not claim it does:

- **Lawful basis, notice and consent** for the data a form collects.
- **Transport and storage** — TLS, retention, encryption at rest, access
  control, deletion on request.
- **Data minimisation in the spec itself.** A form asks for what its author put
  in it; the library validates, it does not judge.
- **Special categories.** A form that collects health, biometric or judicial
  data carries the obligations attached to it, wherever it is rendered.
- **Server-side revalidation.** The browser verdict is a user-experience
  affordance. Any submission acted upon must be revalidated with
  `validateFormData` on a server the integrator controls — this is stated in
  [the validation guide](https://formkrafter.com/guides/validation/) and is a
  security property, not only a data-quality one.

## Secrets

A form spec is data that often travels to a browser and is frequently stored in
a database an operator can read. It must not contain secrets. Where a remote
data source needs credentials, the supported approaches are an httpOnly cookie
on a same-origin API, or a token injected at runtime through the `context` prop
— which is readable by rules and URL interpolation and is **never** part of an
emitted payload.

## Evidence

| Claim | Where |
|---|---|
| Two network call sites in the whole surface, both integrator-directed | Table above |
| No storage API in the published packages | `grep -rE "localStorage\|sessionStorage\|indexedDB\|document.cookie" packages/*/lib packages/*/src --exclude=index.html` returns nothing. The only match in the repository is [`packages/wc/src/index.html`](../../packages/wc/src/index.html), Stencil's dev-server harness page, which is not published: [`packages/wc/package.json`](../../packages/wc/package.json) ships `dist/` and `LICENSE` only. |
| Outbound calls are injection points | [`packages/core/lib/services/`](../../packages/core/lib/services/) |
| Context values never reach an emitted payload | [`e2e/tests/runtime-context.spec.ts`](../../e2e/tests/runtime-context.spec.ts) |
| Server-side revalidation is documented as required | [validation guide](https://formkrafter.com/guides/validation/) |
