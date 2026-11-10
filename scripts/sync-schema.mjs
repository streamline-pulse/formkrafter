import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

// The canonical schema declares the $id it is served at. The strict one (the AI
// profile) has no $id, which OpenAI's strict mode does not take, but is served
// next to it so prompts and hosts can fetch it.
const SCHEMAS = [
  { source: 'packages/core/schema/form-spec.schema.json', target: 'docs/public/schema/form-spec.schema.json', declaresId: true },
  { source: 'packages/core/schema/form-spec.strict.schema.json', target: 'docs/public/schema/form-spec.strict.schema.json', declaresId: false },
]

const check = process.argv.includes('--check')
let failed = false

for (const { source: SOURCE, target: TARGET, declaresId } of SCHEMAS) {
  const source = readFileSync(SOURCE, 'utf8')
  const url = `https://formkrafter.com/${TARGET.replace('docs/public/', '')}`

  if (declaresId) {
    const id = JSON.parse(source).$id
    if (id !== url) {
      console.error(`  ${SOURCE} declares $id ${id}, which is not served at ${url}`)
      process.exit(1)
    }
  }

  const current = existsSync(TARGET) ? readFileSync(TARGET, 'utf8') : null

  if (current === source) {
    console.log(`schema already served at ${url}`)
    continue
  }

  if (check) {
    console.error(`  ${TARGET} is ${current === null ? 'missing' : 'stale'}`)
    console.error(`\n${url} would not serve ${SOURCE}. Run \`bun scripts/sync-schema.mjs\`.`)
    failed = true
    continue
  }

  mkdirSync(dirname(TARGET), { recursive: true })
  writeFileSync(TARGET, source)
  console.log(`${TARGET} ${current === null ? 'created' : 'updated'} — ${url} now resolves`)
}

if (failed) process.exit(1)
