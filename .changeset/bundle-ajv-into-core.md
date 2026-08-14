---
'@streamline-pulse/formkrafter-core': patch
---

ajv, ajv-errors and ajv-formats are now bundled into the published
build instead of being runtime dependencies. ajv-errors reads ajv's
codegen internals, so it silently emits invalid JavaScript when the two
resolve to different copies — which is what a consuming app gets as
soon as anything else (eslint, for one) holds the hoisted `ajv` slot.
The schema then fails to compile and validation is skipped entirely.
Bundling removes the resolution from the equation: applications declare
nothing, and a duplicate ajv elsewhere in the tree no longer reaches
this package. Consumers who bundle for the browser pay 0.7 KB gzipped
for it, since their bundler already pulled ajv in.
