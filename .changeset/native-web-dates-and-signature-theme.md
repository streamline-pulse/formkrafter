---
'@streamline-pulse/formkrafter-react-native': patch
---

Under react-native-web the date bricks now render the browser's native
date, time and datetime-local inputs — the community picker does nothing
on web — with the same stored formats. The signature pad follows the
theme: surface background, text-colored ink, and the background is baked
into the serialized SVG so a dark-theme signature stays readable wherever
the stored image is displayed.
