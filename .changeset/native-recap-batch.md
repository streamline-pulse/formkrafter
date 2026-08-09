---
'@streamline-pulse/formkrafter-core': minor
'@streamline-pulse/formkrafter-react-native': minor
---

Six more native bricks: recap, content, hidden, tags, select boxes and
address — 24 of the 30 web bricks now render natively. The recap
summarization (`collectRecapItems`, `RecapItem`) moves from the wc brick
into core so both renderers share the exact same walk; wc consumes it
from there.
