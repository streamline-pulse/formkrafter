import { readFileSync, writeFileSync } from 'node:fs'

// The docs and the plain-HTML example pin a published version in their CDN
// URLs. Nothing used to move those pins, so every release left them a version
// behind — four times, twice costing a red visual-regression build because the
// example rendered a different release than its baseline.

const FILES = [
  'docs/src/content/docs/reference/packages.mdx',
  'docs/src/content/docs/fr/reference/packages.mdx',
  'examples/html/public/index.html',
]

const version = JSON.parse(
  readFileSync('packages/core/package.json', 'utf8')
).version

const check = process.argv.includes('--check')
const stale = []

for (const file of FILES) {
  const source = readFileSync(file, 'utf8')
  const found = [...source.matchAll(/formkrafter-wc@([\d.]+)/g)].map((m) => m[1])
  const behind = [...new Set(found)].filter((v) => v !== version)
  if (!behind.length) continue

  stale.push(`${file}: ${behind.join(', ')} → ${version}`)
  if (!check) {
    writeFileSync(file, source.replaceAll(/formkrafter-wc@[\d.]+/g, `formkrafter-wc@${version}`))
  }
}

if (!stale.length) {
  console.log(`CDN pins already at ${version}`)
  process.exit(0)
}

for (const line of stale) console.error(`  ${line}`)

if (check) {
  console.error(
    `\n${stale.length} file(s) pin a version other than ${version}. Run \`bun scripts/sync-cdn-pins.mjs\`.`
  )
  process.exit(1)
}

console.log(`${stale.length} file(s) repinned to ${version}`)
