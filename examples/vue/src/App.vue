<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { FkFormBuilder, FkFormRender } from '@streamline-pulse/formkrafter-vue'
import '@streamline-pulse/formkrafter-wc/styles.css'
import type { BrickSpec, ValidationResult } from '@streamline-pulse/formkrafter-core'
import type { DataChangeDetail, SpecChangeDetail } from '@streamline-pulse/formkrafter-wc'

import { contactSpec } from './spec'

/**
 * Specs are plain data, but they are deep objects that the renderer only reads.
 * shallowRef avoids making the whole tree reactive for nothing.
 */
const spec = shallowRef<BrickSpec>(contactSpec)
const data = shallowRef<Record<string, unknown>>({})
const verdict = shallowRef<ValidationResult>()
const submitted = shallowRef<Record<string, unknown>>()
const locale = ref<'en' | 'fr'>('en')

/**
 * A template ref on a Stencil-generated Vue component yields the Vue instance,
 * not the custom element — the component's methods live on `$el`.
 */
const renderer = ref<{ $el: { validate: () => Promise<ValidationResult> } } | null>(null)

function onSpecChange(event: CustomEvent<SpecChangeDetail>) {
  if (event.detail.spec) spec.value = event.detail.spec
}

function onDataChange(event: CustomEvent<DataChangeDetail>) {
  data.value = event.detail.data
}

function onSubmit(event: CustomEvent<DataChangeDetail>) {
  submitted.value = event.detail.data
}

async function validate() {
  verdict.value = await renderer.value?.$el.validate()
}
</script>

<template>
  <main class="page">
    <header class="head">
      <h1>FormKrafter — Vue 3</h1>
      <p>
        The same spec, driven through the Vue wrappers: builder, renderer,
        events and the <code>validate()</code> method.
      </p>
      <button type="button" data-testid="toggle-locale" @click="locale = locale === 'en' ? 'fr' : 'en'">
        Locale: {{ locale }}
      </button>
    </header>

    <section class="panel">
      <h2>Builder</h2>
      <FkFormBuilder :spec="spec" :locales="['en', 'fr']" @spec-change="onSpecChange" />
    </section>

    <section class="panel" data-testid="renderer-panel">
      <h2>Renderer</h2>
      <FkFormRender
        ref="renderer"
        :spec="spec"
        :locale="locale"
        @form-data-change="onDataChange"
        @form-submit="onSubmit"
      />

      <button type="button" class="primary" data-testid="validate" @click="validate">
        Validate
      </button>
    </section>

    <section class="panel">
      <h2>State</h2>
      <p class="label">Live data</p>
      <pre data-testid="data">{{ JSON.stringify(data, null, 2) }}</pre>

      <p class="label">Verdict</p>
      <pre data-testid="verdict">{{ verdict ? JSON.stringify(verdict, null, 2) : '—' }}</pre>

      <p class="label">Submitted</p>
      <pre data-testid="submitted">{{ submitted ? JSON.stringify(submitted, null, 2) : '—' }}</pre>
    </section>
  </main>
</template>
