---
"@streamline-pulse/formkrafter-core": patch
"@streamline-pulse/formkrafter-wc": patch
"@streamline-pulse/formkrafter-react": patch
"@streamline-pulse/formkrafter-vue": patch
"@streamline-pulse/formkrafter-react-native": patch
---

Publish siblings pinned to the version they were built against

Every release since 0.13 published its internal dependencies frozen at whatever
`bun.lock` last recorded: `formkrafter-react@0.17.0` depended on
`formkrafter-wc@0.15.1`, which depended on `formkrafter-core@0.15.1`. Installing
0.17.0 therefore ran 0.15.1 internals — the enveloped option responses and the
`context` prop were unreachable, and the generated React types pointed at the
older component surface.

`bun publish` resolves `workspace:*` from the lockfile rather than from each
package.json, and `bun install` never rewrote the versions it records there.
The version pipeline now syncs them, and CI fails the release if they drift.

Consumers pinning `formkrafter-wc` / `formkrafter-core` through package manager
overrides can drop them.
