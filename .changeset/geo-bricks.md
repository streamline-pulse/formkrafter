---
"@streamline-pulse/formkrafter-core": minor
"@streamline-pulse/formkrafter-wc": minor
"@streamline-pulse/formkrafter-react": minor
"@streamline-pulse/formkrafter-vue": minor
"@streamline-pulse/formkrafter-react-native": minor
---

**Map bricks.** Two new inputs for geographic data, both stored as GeoJSON
geometries: `geo-point` (a `Point`, placed by clicking the map, dragged, or
typed as latitude / longitude) and `geo-area` (a `Polygon`, or a `LineString`
with `shape: 'line'`, drawn vertex by vertex, dragged, removed with a
right-click). The map is a new `fk-geo-map` element on Leaflet, loaded on first
use with OpenStreetMap tiles by default; `center`, `zoom`, `height` and
`tileUrl` are editable in the builder. The native renderer edits a point by its
coordinates and shows an area read-only. New `geo.*` and `panel.*` translations.
