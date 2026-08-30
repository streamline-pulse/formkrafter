# 6 — Mechanism for extracting data

> DPG Standard indicator 6. Every claim below points at a file or a test in this
> repository.

## Summary

FormKrafter holds two documents, both plain JSON, both readable without any
FormKrafter code: the **form spec** and the **form data**. Neither uses a
proprietary container, a binary encoding or an identifier that only this project
can resolve. Extraction is `JSON.stringify` — there is nothing to export.

## The form spec

A form is a tree of bricks. The structure is published as a JSON Schema
(draft 2020-12):

- Source: [`packages/core/schema/form-spec.schema.json`](../../packages/core/schema/form-spec.schema.json)
- Shipped in the npm package: `@streamline-pulse/formkrafter-core/schema/form-spec.schema.json`
- Canonical URL: `https://formkrafter.com/schema/form-spec.schema.json`

The schema is kept honest by tests rather than by convention
([`packages/core/__tests__/form-spec-schema.test.ts`](../../packages/core/__tests__/form-spec-schema.test.ts)):
its enumerations are compared against the TypeScript unions they mirror, so
adding a validator or a brick type without updating the schema fails the build;
and every spec the Form.io converter produces is validated against it.

```json
{
  "type": "panel",
  "id": "column",
  "name": "Contact",
  "configs": { "key": "contact" },
  "children": [
    {
      "type": "input",
      "dataType": "string",
      "id": "text",
      "name": "Text",
      "configs": { "key": "fullName", "label": "Full name" },
      "validations": [{ "validator": "required" }]
    }
  ]
}
```

Storing it is a column in a table or a file on disk. The builder emits it
through its `specChange` event and offers Copy and Download; the identifiers the
builder uses while editing are stripped from everything it emits, so what you
store is the document above and nothing more.

## The form data

Form data is a flat `Record<key, value>`, keyed by each brick's `key`. The
example above produces:

```json
{ "fullName": "Ada Lovelace" }
```

The only nesting is a `collection` brick, whose rows are their own scoped
records:

```json
{ "fullName": "Ada", "contacts": [{ "email": "a@b.c" }, { "email": "d@e.f" }] }
```

There is no wrapper object, no metadata envelope and no reference to a
FormKrafter concept. A row in your own database, an export from your own API and
the payload the renderer emits are the same shape.

## Round trip

Import is symmetric: hand a stored spec to the renderer or the builder and it
resumes.

```ts
import { validateFormData } from '@streamline-pulse/formkrafter-core'

const spec = JSON.parse(await readFile('./contact-form.json', 'utf8'))
const data = JSON.parse(await readFile('./submission.json', 'utf8'))

validateFormData(spec, data)
```

The same call runs in a browser, in Node and in Bun, which means a stored
submission can be re-checked years later against the spec it was captured with,
with no UI involved.

## Migrating away

Two paths out, both without this project's cooperation:

- **Read the JSON.** The spec is documented above and machine-checkable against
  the published schema; the data is a flat record.
- **Migrate in.** `convertFormioForm`
  ([`packages/core/lib/compat/formio.ts`](../../packages/core/lib/compat/formio.ts))
  converts Form.io definitions, which demonstrates the reverse direction is
  ordinary work on ordinary JSON.

## Evidence

| Claim | Where |
|---|---|
| Spec is JSON with a published schema | [`schema/form-spec.schema.json`](../../packages/core/schema/form-spec.schema.json) |
| Schema cannot silently drift from the code | [`form-spec-schema.test.ts`](../../packages/core/__tests__/form-spec-schema.test.ts) |
| Data is a flat record, collections scoped per row | [Form specs guide](https://formkrafter.com/guides/form-specs/) |
| Validation runs outside a browser | [`validator.ts`](../../packages/core/lib/validators/validator.ts) |
| Conversion from another vendor's format | [`compat/formio.ts`](../../packages/core/lib/compat/formio.ts) |
