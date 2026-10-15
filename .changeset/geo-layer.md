---
"@streamline-pulse/formkrafter-core": minor
"@streamline-pulse/formkrafter-wc": minor
"@streamline-pulse/formkrafter-react": minor
"@streamline-pulse/formkrafter-vue": minor
"@streamline-pulse/formkrafter-react-native": minor
---

**Zones on a reference layer.** `geo-layer` loads a GeoJSON FeatureCollection
(`layerUrl`, fetched once per page) and lets the user pick a zone by clicking it
on the map or from a select; the field stores `{ code, name }` read from
`codeProperty` / `nameProperty`, or an array of them with `multiple`.
`fk-geo-map` gains the `layer` mode with `layerUrl`, `selected`, `multiple` and
a `layerChange` event. The native renderer shows the chosen zones read-only.
