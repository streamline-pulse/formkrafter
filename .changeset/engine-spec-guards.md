---
'@streamline-pulse/formkrafter-react-native': patch
---

The engine and renderers now guard against a missing spec — during a
Metro fast refresh the spec module can be undefined for one frame, and
it used to reach core's WeakMap-backed validator caches and crash with
"WeakMap key must be an Object". Same protection the web renderer always
had.
