---
"@streamline-pulse/formkrafter-core": minor
"@streamline-pulse/formkrafter-wc": minor
---

**Breaking:** `JsRunnerService.validateJs()` now returns `{ valid }` instead of
`{ valide }`.

The misspelling was part of the public interface, so anyone implementing a
custom JS runner or reading the result inherited it. The result type is now
exported as `JsValidationResult`:

```ts
import type { JsValidationResult } from '@streamline-pulse/formkrafter-core'

const { valid, error } = services.jsRunnerService.validateJs(code)
```

If you read `validation.valide`, rename it to `validation.valid`. If you
implement `JsRunnerService` yourself, return `valid` from `validateJs`. Nothing
else changes — the semantics and the `error` field are untouched.

**Also removed:** the `JsRunnerServiceImplementation` export, an unused alias of
`SandboxJsRunnerService`. Import `SandboxJsRunnerService` directly.
