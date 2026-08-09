#!/usr/bin/env node
/**
 * Published-tarball smoke test.
 *
 * smoke-esm.mjs symlinks the workspace directories, so it validates the
 * exports maps but not the `files` allowlist: a build artifact missing from
 * the tarball would only surface after publishing. This script packs each
 * package the way a release does, installs the tarballs into a scratch
 * project, and imports them by name — the closest rehearsal of `npm install`
 * that can run before anything reaches the registry.
 */
import { mkdtempSync, writeFileSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

const ROOT = resolve(import.meta.dirname, '..')

const DIRS = {
  'formkrafter-core': 'packages/core',
  'formkrafter-wc': 'packages/wc',
  'formkrafter-react': 'packages/react',
  'formkrafter-vue': 'packages/vue',
}

const sandbox = mkdtempSync(join(tmpdir(), 'fk-pack-'))

try {
  // Pack with bun so workspace:/catalog: protocols are rewritten to real
  // versions, exactly as the release does.
  const tarballs = {}
  for (const [name, dir] of Object.entries(DIRS)) {
    execFileSync('bun', ['pm', 'pack', '--destination', sandbox], {
      cwd: join(ROOT, dir),
      stdio: ['ignore', 'ignore', 'inherit'],
    })
    const file = readdirSync(sandbox).find(
      (f) => f.includes(name) && f.endsWith('.tgz') && !Object.values(tarballs).includes(f),
    )
    if (!file) throw new Error(`no tarball produced for ${name}`)
    tarballs[name] = file
  }

  // Overrides force every cross-dependency onto the local tarballs — without
  // them npm would happily satisfy formkrafter-react's dependency on core
  // from the registry and the test would validate the published code instead
  // of the workspace build.
  const local = Object.fromEntries(
    Object.entries(tarballs).map(([name, file]) => [
      `@streamline-pulse/${name}`,
      `file:./${file}`,
    ]),
  )
  writeFileSync(
    join(sandbox, 'package.json'),
    JSON.stringify(
      {
        name: 'fk-pack-smoke',
        private: true,
        type: 'module',
        dependencies: { ...local, react: '*', vue: '*' },
        overrides: local,
      },
      null,
      2,
    ),
  )

  execFileSync('npm', ['install', '--no-audit', '--no-fund'], {
    cwd: sandbox,
    stdio: ['ignore', 'ignore', 'inherit'],
  })

  let failed = 0

  for (const name of Object.keys(DIRS)) {
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
        { cwd: sandbox, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      )
      console.log(`  ok    ${specifier} — ${out.trim()} exports from the tarball`)
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

  // The opt-in stylesheet is referenced by every quick-start snippet; make
  // sure the subpath survives packing too.
  try {
    execFileSync(
      process.execPath,
      [
        '-e',
        `const { createRequire } = require('node:module')
         createRequire(process.cwd() + '/package.json')
           .resolve('@streamline-pulse/formkrafter-wc/styles.css')`,
      ],
      { cwd: sandbox, stdio: ['ignore', 'ignore', 'pipe'] },
    )
    console.log('  ok    formkrafter-wc/styles.css subpath')
  } catch {
    failed++
    console.error('  FAIL  formkrafter-wc/styles.css subpath missing from the tarball')
  }

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed against the packed tarballs.`)
    process.exit(1)
  }

  console.log('\nAll packages install and resolve from their tarballs.')
} finally {
  rmSync(sandbox, { recursive: true, force: true })
}
