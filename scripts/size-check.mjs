#!/usr/bin/env node
/**
 * Size budget for the published packages.
 *
 * The docs advertise concrete bundle sizes against Form.io; this keeps the
 * claim honest and catches a heavy dependency the day it lands rather than
 * releases later. Methodology matches the docs table: bundle the package
 * entry with bun, minified, and measure the gzipped output.
 *
 * Budgets are current size plus ~10% headroom — tighten or raise them
 * consciously when the numbers move for a good reason.
 *
 * Reading the numbers: the wc entry keeps its heavy pieces (CodeMirror)
 * behind dynamic imports, so its figure is the eager cost; the react/vue
 * wrappers re-export everything statically, so theirs is the everything-
 * included upper bound. These are drift tripwires, not the download sizes
 * advertised in the docs.
 */
import { mkdtempSync, rmSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { gzipSync } from 'node:zlib'

const ROOT = resolve(import.meta.dirname, '..')

const TARGETS = [
  { name: 'formkrafter-core', entry: 'packages/core/dist/index.js', budgetKb: 100 },
  { name: 'formkrafter-wc (builder + renderer)', entry: 'packages/wc/dist/components/index.js', budgetKb: 105, external: [] },
  { name: 'formkrafter-react', entry: 'packages/react/dist/index.js', budgetKb: 325, external: ['react'] },
  { name: 'formkrafter-vue', entry: 'packages/vue/dist/index.js', budgetKb: 325, external: ['vue'] },
  { name: 'formkrafter-wc styles.css', file: 'packages/wc/dist/formkrafter-wc/formkrafter-wc.css', budgetKb: 10 },
]

const out = mkdtempSync(join(tmpdir(), 'fk-size-'))
let failed = 0

try {
  for (const target of TARGETS) {
    let bytes
    if (target.file) {
      bytes = gzipSync(readFileSync(join(ROOT, target.file))).length
    } else {
      const bundle = join(out, target.name.replace(/[^a-z-]/g, '') + '.js')
      execFileSync(
        'bun',
        [
          'build',
          join(ROOT, target.entry),
          '--minify',
          '--target=browser',
          ...(target.external ?? []).flatMap((e) => ['--external', e]),
          '--outfile',
          bundle,
        ],
        { stdio: ['ignore', 'ignore', 'inherit'] },
      )
      statSync(bundle)
      bytes = gzipSync(readFileSync(bundle)).length
    }

    const kb = bytes / 1024
    const over = kb > target.budgetKb
    if (over) failed++
    console.log(
      `  ${over ? 'FAIL' : 'ok  '}  ${target.name.padEnd(40)} ${kb.toFixed(1).padStart(7)} KB gz  (budget ${target.budgetKb} KB)`,
    )
  }

  if (failed > 0) {
    console.error(`\n${failed} artifact(s) exceed their size budget.`)
    process.exit(1)
  }
  console.log('\nAll artifacts are within budget.')
} finally {
  rmSync(out, { recursive: true, force: true })
}
