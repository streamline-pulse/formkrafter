#!/usr/bin/env bun
/**
 * What a page downloads before it can show a form, as opposed to everything
 * the bundler emits.
 *
 * `size-check.mjs` bundles each package entry into one file: a drift
 * tripwire. This script builds what an application writes — "import
 * FkFormRender", "define <fk-form-render>" — with code splitting, as Vite or
 * any bundler does, and sums two figures from the build graph:
 *
 * - eager: the entry chunk plus every chunk it reaches through static
 *   imports, i.e. what loads before the form renders;
 * - all chunks: eager plus the chunks behind dynamic `import()` (the code
 *   editor, the map, …), fetched only when a brick needs them.
 *
 * React and Vue themselves are left out (external): the application ships
 * them anyway. Run `bun run build` first; the numbers are gzipped KB.
 *
 *   bun run size:eager
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const ROOT = resolve(import.meta.dirname, '..')

// The entries live inside an example app: Bun links workspace packages into
// each app's own node_modules, not the repository root.
const CASES = [
  {
    name: 'React — FkFormRender only',
    app: 'examples/tanstack-start',
    external: ['react', 'react-dom'],
    code: `import { FkFormRender } from '@streamline-pulse/formkrafter-react'\nexport default FkFormRender\n`,
  },
  {
    name: 'React — every component',
    app: 'examples/tanstack-start',
    external: ['react', 'react-dom'],
    code: `export * from '@streamline-pulse/formkrafter-react'\n`,
  },
  {
    name: 'Web Components — <fk-form-render> only',
    app: 'examples/tanstack-start',
    external: [],
    code: `import { defineCustomElement } from '@streamline-pulse/formkrafter-wc/dist/components/fk-form-render.js'\ndefineCustomElement()\n`,
  },
  {
    name: 'Web Components — <fk-form-builder>',
    app: 'examples/tanstack-start',
    external: [],
    code: `import { defineCustomElement } from '@streamline-pulse/formkrafter-wc/dist/components/fk-form-builder.js'\ndefineCustomElement()\n`,
  },
  {
    name: 'Vue — FkFormRender only',
    app: 'examples/vue',
    external: ['vue'],
    code: `import { FkFormRender } from '@streamline-pulse/formkrafter-vue'\nexport default FkFormRender\n`,
  },
]

const gz = (path) => gzipSync(readFileSync(path)).length / 1024

const rows = []
for (const item of CASES) {
  const work = join(ROOT, item.app, '.fk-size')
  rmSync(work, { recursive: true, force: true })
  mkdirSync(work, { recursive: true })
  try {
    const entry = join(work, 'entry.js')
    writeFileSync(entry, item.code)
    const outdir = join(work, 'out')
    const result = await Bun.build({
      entrypoints: [entry],
      outdir,
      target: 'browser',
      format: 'esm',
      splitting: true,
      minify: true,
      external: item.external,
      // A production build, as the application's bundler would make it.
      conditions: ['production'],
      define: { 'process.env.NODE_ENV': '"production"' },
      metafile: true,
    })
    if (!result.success) throw new AggregateError(result.logs, `${item.name}: build failed`)

    const meta = typeof result.metafile === 'string' ? JSON.parse(result.metafile) : result.metafile
    const outputs = meta.outputs
    // Output paths, and the chunks they import, are relative to outdir.
    const abs = (path) => resolve(outdir, path)
    const key = (path) => Object.keys(outputs).find((candidate) => abs(candidate) === abs(path))

    const entryKey = Object.keys(outputs).find((path) => outputs[path].entryPoint && path.endsWith('.js'))
    const eager = new Set()
    const walk = (path) => {
      if (eager.has(path)) return
      eager.add(path)
      for (const dep of outputs[path].imports ?? []) {
        if (dep.kind !== 'import-statement' || dep.external) continue
        const found = key(dep.path) ?? key(join(dirname(path), dep.path))
        if (!found) throw new Error(`${item.name}: ${path} imports ${dep.path}, which is not an output`)
        walk(found)
      }
    }
    walk(entryKey)

    const js = Object.keys(outputs).filter((path) => path.endsWith('.js'))
    const sum = (paths) => paths.reduce((total, path) => total + gz(abs(path)), 0)
    rows.push({
      name: item.name,
      entry: gz(abs(entryKey)),
      eager: sum([...eager]),
      all: sum(js),
      chunks: `${eager.size}/${js.length}`,
    })
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}

console.log(`${'What the page imports'.padEnd(42)} ${'entry'.padStart(8)} ${'eager'.padStart(8)} ${'all'.padStart(8)}  chunks (eager/all)`)
for (const row of rows) {
  console.log(
    `${row.name.padEnd(42)} ${row.entry.toFixed(0).padStart(5)} KB ${row.eager.toFixed(0).padStart(5)} KB ${row.all.toFixed(0).padStart(5)} KB  ${row.chunks}`,
  )
}
console.log('\nKB gzipped; eager = entry + statically imported chunks, all = eager + lazy chunks.')
