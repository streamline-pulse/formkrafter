---
'@streamline-pulse/formkrafter-core': minor
'@streamline-pulse/formkrafter-react-native': minor
---

The native select gains every option source the web has — remote HTTP
with `{token}` interpolation, header lines and debounced
search-as-you-type, catalog through optionSourceService, dataMap paths
and sandboxed JS — plus a search field and loading state in the sheet;
the remote-options helpers move from wc into core for that. The data
grid arrives natively: rows as cards rendered through the same brick
registry (custom bricks work inside a grid for free), with add, remove,
reorder and per-row validation. The stepper gets a proper design:
numbered circles joined by progress connectors, done checkmarks and a
full-width primary action.
