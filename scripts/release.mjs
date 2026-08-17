import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'

// Derived from the filesystem, not a hardcoded list: a new package joins
// the release the day its directory appears. (formkrafter-react-native
// missed its first release exactly because this used to be a list.)
const packages = readdirSync('packages', { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

for (const dir of packages) {
  const pkg = JSON.parse(readFileSync(`packages/${dir}/package.json`, 'utf8'))
  if (pkg.private) continue

  const id = `${pkg.name}@${pkg.version}`

  const view = spawnSync('npm', ['view', id, 'version'], { stdio: 'pipe' })
  if (view.status === 0) {
    console.log(`skip ${id} — already on the registry`)
    continue
  }

  console.log(`publishing ${id}`)

  // The registry answers 5xx often enough that a single transient failure once
  // left vue a version behind its siblings while the other four went out. Each
  // attempt re-checks the registry first: a publish that landed before the
  // error is reported as already there rather than retried into a conflict.
  let published = false
  for (let attempt = 1; attempt <= 3 && !published; attempt++) {
    if (attempt > 1) {
      const seen = spawnSync('npm', ['view', id, 'version'], { stdio: 'pipe' })
      if (seen.status === 0) {
        console.log(`${id} landed despite the error — continuing`)
        published = true
        break
      }
      const wait = attempt * 5
      console.log(`retry ${attempt}/3 for ${id} in ${wait}s`)
      spawnSync('sleep', [String(wait)], { stdio: 'inherit' })
    }

    const publish = spawnSync('bun', ['publish', '--cwd', `packages/${dir}`], {
      stdio: 'inherit',
    })
    published = publish.status === 0
  }

  if (!published) {
    console.error(`failed to publish ${id} after 3 attempts`)
    process.exit(1)
  }
  console.log(`New tag: v${pkg.version}`)
}
