import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const SOURCE = 'packages/core/schema/form-spec.schema.json'
const TARGET = 'docs/public/schema/form-spec.schema.json'

const source = readFileSync(SOURCE, 'utf8')
const id = JSON.parse(source).$id
const check = process.argv.includes('--check')

const expected = `https://formkrafter.com/${TARGET.replace('docs/public/', '')}`
if (id !== expected) {
  console.error(`  ${SOURCE} declares $id ${id}, which is not served at ${expected}`)
  process.exit(1)
}

const current = existsSync(TARGET) ? readFileSync(TARGET, 'utf8') : null

if (current === source) {
  console.log(`schema already served at ${id}`)
  process.exit(0)
}

if (check) {
  console.error(`  ${TARGET} is ${current === null ? 'missing' : 'stale'}`)
  console.error(`\nThe schema's $id (${id}) would not resolve. Run \`bun scripts/sync-schema.mjs\`.`)
  process.exit(1)
}

mkdirSync(dirname(TARGET), { recursive: true })
writeFileSync(TARGET, source)
console.log(`${TARGET} ${current === null ? 'created' : 'updated'} — ${id} now resolves`)
