#!/usr/bin/env node
/**
 * Engine-side timings for the native renderer, on the 93-brick production
 * form the web perf table uses. The engine is pure TypeScript (no React,
 * no react-native), so Node can execute the exact code that ships — an
 * upper-bound sanity check between two on-device profiling sessions, not a
 * substitute for them: Hermes has its own performance profile.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const { FormEngine } = await import(
  `${ROOT}/packages/react-native/dist/engine/form-engine.js`
)
const spec = JSON.parse(
  readFileSync(
    `${ROOT}/packages/react-native/__tests__/fixtures/production-form.json`,
    'utf8',
  ),
)

const time = (label, runs, fn) => {
  fn() // warm caches (Ajv compilation is once per spec)
  const start = performance.now()
  for (let i = 0; i < runs; i++) fn(i)
  const total = performance.now() - start
  console.log(`  ${label.padEnd(34)} ${(total / runs).toFixed(3)} ms/op  (${runs} runs)`)
}

console.log('FormEngine on the 93-brick production form:')

time('constructor', 50, () => new FormEngine({ spec }))

const engine = new FormEngine({ spec })
time('setValues (one keystroke)', 500, (i) =>
  engine.setValues({ type_de_demandeur: `value ${i}` }),
)
time('validate, memoized (data unchanged)', 200, () => engine.validate())
time('change + validate (cache miss)', 200, (i) => {
  engine.setValues({ type_de_demandeur: `value ${i}` })
  engine.validate()
})

const listeners = new FormEngine({ spec })
listeners.subscribe(() => {})
time('setValues with a subscriber', 500, (i) =>
  listeners.setValues({ type_de_demandeur: `value ${i}` }),
)
