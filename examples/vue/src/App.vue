<script setup lang="ts">
import { computed, ref, shallowRef, watchEffect } from 'vue'
import { FkFormBuilder } from '@streamline-pulse/formkrafter-vue'
import { createBrick, h, registerBrick } from '@streamline-pulse/formkrafter-wc'
import { services } from '@streamline-pulse/formkrafter-core'
import '@streamline-pulse/formkrafter-wc/styles.css'
import type { BrickSpec } from '@streamline-pulse/formkrafter-core'
import type { SpecChangeDetail } from '@streamline-pulse/formkrafter-wc'

import FormDemo from './FormDemo.vue'
import {
  addressSubSpec,
  contactSpec,
  customBrickSpec,
  gridSpec,
  nestedSpec,
  rulesSpec,
  wizardSpec,
} from './specs'

/* ---------------------------------------------------------------- theme --
 * FormKrafter's dark mode is pure CSS cascade: it needs `.dark` or
 * `data-fk-theme="dark"` on an ancestor. Without it the components stay in
 * light mode regardless of the page's own colours.
 *
 * The initial value is decided by an inline script in index.html so there is
 * no flash; here we only mirror and update it. This page's own tokens key off
 * the same `.dark` class, so the toggle moves the page and the form together.
 */
// Read at setup, not in onMounted: watchEffect runs immediately, so a
// placeholder default would overwrite what the inline script decided before
// onMounted ever got to read it back.
const dark = ref(document.documentElement.classList.contains('dark'))

watchEffect(() => {
  const root = document.documentElement
  root.dataset.fkTheme = dark.value ? 'dark' : 'light'
  root.classList.toggle('dark', dark.value)
})

/* ------------------------------------------------------------- services --
 * Nested forms resolve their `specRef` through this service. A real app
 * would fetch from its own form store.
 */
const catalog: Record<string, BrickSpec> = { address: addressSubSpec }

services.specSourceService = {
  fetchSpec: async (ref) => {
    await new Promise((resolve) => setTimeout(resolve, 120))
    const found = ref in catalog ? catalog[ref] : undefined
    if (!found) throw new Error(`Unknown form: ${ref}`)
    return found
  },
}

/* --------------------------------------------------------- custom brick --
 * Registered once, then usable from any spec by its id. `h` comes from the
 * wc package so the app needs no Stencil dependency of its own.
 */
registerBrick(
  createBrick({
    type: 'input',
    dataType: 'number',
    id: 'rating',
    name: 'Rating',
    category: 'Inputs',
    defaultConfigs: { label: 'Rating' },
    render: (props) =>
      h('label', { class: { 'fk-field': true } }, [
        h('span', { class: { 'fk-field__label': true } }, String(props.configs?.label ?? 'Rating')),
        h(
          'span',
          { class: { 'fk-rating': true } },
          [1, 2, 3, 4, 5].map((star) =>
            h(
              'button',
              {
                type: 'button',
                'aria-label': `${star} stars`,
                class: { 'fk-rating__star': true },
                onClick: () => props.onDataChange?.(star),
              },
              star <= Number(props.data ?? 0) ? '★' : '☆'
            )
          )
        ),
        props.error
          ? h('span', { class: { 'fk-field__error': true }, role: 'alert' }, props.error)
          : null,
      ]),
  })
)

/* ----------------------------------------------------------------- tabs -- */
interface Demo {
  id: string
  label: string
  spec: BrickSpec
  /** The stepper emits formSubmit from its own button, so it needs no Validate. */
  validate?: boolean
}

const demos: Demo[] = [
  { id: 'basic', label: 'Basic form', spec: contactSpec },
  { id: 'wizard', label: 'Wizard', spec: wizardSpec, validate: false },
  { id: 'rules', label: 'Dynamic rules', spec: rulesSpec },
  { id: 'grid', label: 'Data grid', spec: gridSpec },
  { id: 'nested', label: 'Nested form', spec: nestedSpec },
  { id: 'custom', label: 'Custom brick', spec: customBrickSpec },
]

const active = ref('basic')
const current = computed(() => demos.find((d) => d.id === active.value) ?? demos[0])

const notes: Record<string, string> = {
  basic: 'Props in, events out, and validate() reached through a template ref.',
  wizard: 'The stepper gates each step and emits formSubmit from its own button.',
  rules: 'Pick “Shipping” — a JSON Logic rule reveals the address field, and hidden fields are excluded from validation.',
  grid: 'A collection: each row validates on its own and errors report as members[0].email.',
  nested: 'The address block is a separate spec, resolved at render time through services.specSourceService.',
  custom: 'A star-rating brick registered at runtime with registerBrick, validated like any built-in.',
}

/* -------------------------------------------------------------- builder -- */
const builderSpec = shallowRef<BrickSpec>(contactSpec)
const locale = ref<'en' | 'fr'>('en')
</script>

<template>
  <main class="page">
    <header class="head">
      <div>
        <h1>FormKrafter — Vue 3</h1>
        <p>
          The same specs, driven through the Vue wrappers: both components, all
          three events, and the <code>validate()</code> method.
        </p>
      </div>

      <div class="head__actions">
        <button type="button" data-testid="toggle-locale" @click="locale = locale === 'en' ? 'fr' : 'en'">
          Locale: {{ locale }}
        </button>
        <button type="button" data-testid="toggle-theme" @click="dark = !dark">
          {{ dark ? 'Dark' : 'Light' }}
        </button>
      </div>
    </header>

    <section class="panel">
      <h2>Renderer</h2>

      <nav class="tabs" role="tablist">
        <button
          v-for="demo in demos"
          :key="demo.id"
          role="tab"
          type="button"
          class="tab"
          :class="{ 'tab--active': demo.id === active }"
          :aria-selected="demo.id === active"
          :data-testid="`tab-${demo.id}`"
          @click="active = demo.id"
        >
          {{ demo.label }}
        </button>
      </nav>

      <p class="note" data-testid="note">{{ notes[active] }}</p>

      <FormDemo
        :key="active"
        :spec="current.spec"
        :locale="locale"
        :show-validate="current.validate !== false"
      />
    </section>

    <section class="panel" data-testid="builder-panel">
      <h2>Builder</h2>
      <p class="note">
        Drag bricks from the palette. Every edit emits <code>specChange</code>
        with the new spec and its RFC 6902 patches.
      </p>
      <FkFormBuilder
        :spec="builderSpec"
        :locales="['en', 'fr']"
        @spec-change="
          builderSpec = ($event as CustomEvent<SpecChangeDetail>).detail.spec ?? builderSpec
        "
      />
    </section>
  </main>
</template>
