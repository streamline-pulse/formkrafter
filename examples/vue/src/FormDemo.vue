<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { FkFormRender } from '@streamline-pulse/formkrafter-vue'
import type { BrickSpec, ValidationResult } from '@streamline-pulse/formkrafter-core'
import type { DataChangeDetail } from '@streamline-pulse/formkrafter-wc'

const props = defineProps<{
  spec: BrickSpec
  locale?: string
  /** The stepper emits formSubmit itself, so its demo hides the button. */
  showValidate?: boolean
}>()

const data = shallowRef<Record<string, unknown>>({})
const verdict = shallowRef<ValidationResult>()
const submitted = shallowRef<Record<string, unknown>>()

/**
 * A template ref on a Stencil-generated Vue component yields the Vue
 * instance, not the custom element — the component's methods live on `$el`.
 */
const renderer = ref<{ $el: { validate: () => Promise<ValidationResult> } } | null>(null)

async function validate() {
  verdict.value = await renderer.value?.$el.validate()
}
</script>

<template>
  <div class="demo">
    <div class="demo__form">
      <FkFormRender
        ref="renderer"
        :spec="props.spec"
        :locale="props.locale"
        @form-data-change="data = ($event as CustomEvent<DataChangeDetail>).detail.data"
        @form-submit="submitted = ($event as CustomEvent<DataChangeDetail>).detail.data"
      />

      <button
        v-if="props.showValidate !== false"
        type="button"
        class="primary"
        data-testid="validate"
        @click="validate"
      >
        Validate
      </button>
    </div>

    <div class="demo__state">
      <p class="label">Live data</p>
      <pre data-testid="data">{{ JSON.stringify(data, null, 2) }}</pre>

      <p class="label">Verdict</p>
      <pre data-testid="verdict">{{ verdict ? JSON.stringify(verdict, null, 2) : '—' }}</pre>

      <p class="label">Submitted</p>
      <pre data-testid="submitted">{{ submitted ? JSON.stringify(submitted, null, 2) : '—' }}</pre>
    </div>
  </div>
</template>
