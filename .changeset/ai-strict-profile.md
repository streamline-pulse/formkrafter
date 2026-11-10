---
"@streamline-pulse/formkrafter-core": minor
"@streamline-pulse/formkrafter-wc": minor
"@streamline-pulse/formkrafter-react": minor
"@streamline-pulse/formkrafter-vue": minor
"@streamline-pulse/formkrafter-react-native": minor
---

Forms written by a language model. `schema/form-spec.strict.schema.json` (exported as `@streamline-pulse/formkrafter-core/schema/form-spec.strict.schema.json`) is the AI profile of the form spec, accepted by OpenAI strict structured output: a root `{ form }`, one closed definition per brick id (a `select` has its `options`), every property present and nullable when optional, and rules as `hiddenWhen` / `disabledWhen` holding a JsonLogic subset (`var`, `==`, `!=`, `!`, `>`, `>=`, `<`, `<=`, `in`, `and`, `or`, `+`, `if`). It is generated from the new brick catalog (`BRICK_CATALOG`, with `AI_EXCLUDED_BRICKS` naming the bricks a model does not write and why). `fromStrictSpec(output)` turns the model's output into a canonical spec that `fk-form-render` and `validateFormData` take unchanged. The canonical `form-spec.schema.json` does not change. New guide: « Generating forms with an LLM ».
