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
  const publish = spawnSync('bun', ['publish', '--cwd', `packages/${dir}`], {
    stdio: 'inherit',
  })
  if (publish.status !== 0) {
    console.error(`failed to publish ${id}`)
    process.exit(1)
  }
  console.log(`New tag: v${pkg.version}`)
}
