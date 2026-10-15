---
"@streamline-pulse/formkrafter-core": minor
"@streamline-pulse/formkrafter-wc": minor
"@streamline-pulse/formkrafter-react": minor
"@streamline-pulse/formkrafter-vue": minor
"@streamline-pulse/formkrafter-react-native": minor
---

**Geocoded address brick.** `geo-address` looks an address up while typing
(new `fk-address-search` element; Nominatim `jsonv2` by default, any provider
answering in that shape through `searchUrl` with `{q}`, optional
`countryCodes`), lists the matches and stores the pick as a GeoJSON `Feature`
with the normalised address (street, city, postcode, country, place id) and
its point, which a map under the field lets the user adjust. Text that is never
matched stays as a label without geometry. The native renderer edits the label
only and keeps a point obtained on the web.
