# @streamline-pulse/formkrafter-vue

Vue 3 components for FormKrafter — generated at build time from the [Web Components](../wc/README.md).

## Install & use

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { FkFormBuilder, FkFormRender } from '@streamline-pulse/formkrafter-vue'
import '@streamline-pulse/formkrafter-wc/styles.css'
import type { BrickSpec } from '@streamline-pulse/formkrafter-core'
import type { SpecChangeDetail, DataChangeDetail } from '@streamline-pulse/formkrafter-wc'

const spec = ref<BrickSpec>()
const renderEl = ref<InstanceType<typeof FkFormRender>>()

const onSpecChange = (detail: SpecChangeDetail) => { spec.value = structuredClone(detail.spec) }
const onSubmit = (detail: DataChangeDetail) => post(detail.data)

const validate = async () => {
  const result = await renderEl.value?.$el.validate()
  console.log(result?.valid, result?.errors)
}
</script>

<template>
  <FkFormBuilder :locales="['en', 'fr']" @spec-change="onSpecChange" />

  <FkFormRender
    v-if="spec"
    ref="renderEl"
    :spec="spec"
    locale="fr"
    @form-submit="onSubmit"
  />

  <button @click="validate">Validate</button>
</template>
```

Conventions: events use kebab-case (`@spec-change`, `@form-data-change`, `@form-submit`); complex props bind directly (`:spec`, `:data`, `:locales`); element methods (`validate()`) are reached through the component ref's `$el`.

For SSR (Nuxt), mount FormKrafter components client-side only (`<ClientOnly>`), and revalidate submissions server-side with `validateFormData` from `@streamline-pulse/formkrafter-core`.
