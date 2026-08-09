---
'@streamline-pulse/formkrafter-react-native': minor
---

The signature brick arrives on a `formkrafter-react-native/signature`
entry point (react-native-svg as an optional peer), storing a data URL
like the web brick — image/svg+xml here. Every relative import in the
package now carries its .js extension: the packed-tarball smoke test
caught the entry points failing strict ESM resolution, the exact bug
class the web wrappers hit before their fix.
