import { readFileSync, readdirSync, writeFileSync } from 'node:fs'

// `bun publish` resolves each `workspace:*` dependency to the version bun.lock
// records for that workspace — not the one in its package.json. `bun install`
// leaves those recorded versions alone, so every release since 0.13 published
// siblings pinned to whatever the lockfile last saw: 0.17.0 shipped depending
// on 0.15.1. Rewriting only the version line keeps dependency resolution
// untouched, which a full relock would not.

const LOCK = 'bun.lock'

const wanted = new Map(
  readdirSync('packages', { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => [
      `packages/${entry.name}`,
      JSON.parse(readFileSync(`packages/${entry.name}/package.json`, 'utf8'))
        .version,
    ])
)

const lock = readFileSync(LOCK, 'utf8')
const changed = []

const next = lock.replace(
  /("packages\/[^"]+": \{\n\s+"name": "[^"]+",\n\s+"version": ")([^"]+)(")/g,
  (match, head, current, tail, offset) => {
    const path = lock.slice(offset + 1, lock.indexOf('"', offset + 1))
    const target = wanted.get(path)
    if (!target || target === current) return match

    changed.push(`${path}: ${current} → ${target}`)
    return `${head}${target}${tail}`
  }
)

const check = process.argv.includes('--check')

if (!changed.length) {
  console.log('bun.lock workspace versions already match')
  process.exit(0)
}

for (const line of changed) console.error(`  ${line}`)

if (check) {
  console.error(
    `\n${changed.length} workspace version(s) stale in ${LOCK}. Publishing now would pin` +
      ' siblings to the version above the arrow. Run `bun scripts/sync-lock-versions.mjs`.'
  )
  process.exit(1)
}

writeFileSync(LOCK, next)
console.log(`${changed.length} workspace version(s) synced in ${LOCK}`)
