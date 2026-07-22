import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const packages = ['core', 'wc', 'react', 'vue']

for (const dir of packages) {
  const pkg = JSON.parse(readFileSync(`packages/${dir}/package.json`, 'utf8'))
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
