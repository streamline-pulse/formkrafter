#!/usr/bin/env node
/**
 * Node ESM resolution smoke test.
 *
 * Bundlers (Vite, webpack, Rollup) tolerate extensionless relative specifiers;
 * Node's ESM resolver does not — it requires the exact path. A package can
 * therefore work in every dev server and still fail the moment it is imported
 * from a real Node process, which is what happens during SSR when the package
 * is externalised.
 *
 * This test imports each published entry point the way Node would: by package
 * name, from a scratch ESM project, with no bundler in the loop. It exercises
 * the `exports` map and every relative specifier reachable from the entry.
 */
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

const ROOT = resolve(import.meta.dirname, '..')

const PACKAGES = [
  'formkrafter-core',
  'formkrafter-wc',
  'formkrafter-react',
  'formkrafter-vue',
]

const DIRS = {
  'formkrafter-core': 'packages/core',
  'formkrafter-wc': 'packages/wc',
  'formkrafter-react': 'packages/react',
  'formkrafter-vue': 'packages/vue',
}

const sandbox = mkdtempSync(join(tmpdir(), 'fk-smoke-'))

try {
  // A pristine ESM project: nothing but "type": "module".
  writeFileSync(
    join(sandbox, 'package.json'),
    JSON.stringify({ name: 'fk-esm-smoke', private: true, type: 'module' }, null, 2)
  )

  // Link the built packages in. Node resolves symlinks to their realpath, so
  // each package's own bare dependencies still resolve from the monorepo.
  const scope = join(sandbox, 'node_modules', '@streamline-pulse')
  mkdirSync(scope, { recursive: true })
  for (const name of PACKAGES) {
    symlinkSync(join(ROOT, DIRS[name]), join(scope, name), 'dir')
  }

  let failed = 0

  for (const name of PACKAGES) {
    const specifier = `@streamline-pulse/${name}`
    try {
      const out = execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `const m = await import(${JSON.stringify(specifier)})
           if (Object.keys(m).length === 0) {
             console.error('resolved but exports nothing')
             process.exit(1)
           }
           console.log(Object.keys(m).length)`,
        ],
        { cwd: sandbox, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
      )
      console.log(`  ok    ${specifier} — ${out.trim()} exports`)
    } catch (error) {
      failed++
      const stderr = String(error.stderr ?? error.message)
      const line =
        stderr.split('\n').find((l) => /Error|Cannot find/.test(l)) ??
        stderr.split('\n')[0]
      console.error(`  FAIL  ${specifier}`)
      console.error(`        ${line.trim()}`)
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} package(s) are not resolvable by Node's ESM loader.`)
    process.exit(1)
  }

  console.log(`\nAll ${PACKAGES.length} packages resolve under plain Node ESM.`)
} finally {
  rmSync(sandbox, { recursive: true, force: true })
}
