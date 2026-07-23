---
title: Nested forms
description: Reference a form inside a form with specRef, resolved through a pluggable spec source.
---

A `nested-form` brick references another form through its `specRef` config. At render time the reference is resolved and inlined as a labelled group — fields, validations and rules included — so the rest of the pipeline (rendering, rules, validation, recap) sees one plain spec.

```json
{
  "type": "panel",
  "id": "nested-form",
  "configs": { "key": "address", "label": "Delivery address", "specRef": "adresse" }
}
```

## Wire the spec source

```ts
import { services } from '@streamline-pulse/formkrafter-core'

services.specSourceService = {
  fetchSpec: async (ref) => (await fetch(`/api/forms/${ref}`)).json(),
}
```

The default is `FetchSpecSourceService` — it treats the ref as a URL and supports `baseUrl`, headers and per-URL caching. `<fk-form-render>` runs the expansion automatically (with loading and error states); configure the service once at startup.

## Backend

Expand before validating so the backend sees the complete tree:

```ts
import { expandSpec, validateFormData } from '@streamline-pulse/formkrafter-core'

const full = await expandSpec(spec)
const verdict = validateFormData(full, payload)
```

`expandSpec` detects reference cycles and enforces a depth limit (5), so a form that references itself fails loudly instead of looping.
