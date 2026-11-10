/**
 * A dependency-free static server for `public/`.
 *
 * The point of this example is that it needs no build tooling, so it would be
 * odd to pull in a dev server just to look at it. Bun can serve the directory
 * in a few lines.
 */
const port = Number(process.env.PORT ?? 4181)
const root = new URL('./public/', import.meta.url)
const index = new URL('index.html', root)

/**
 * The page pins `formkrafter-wc@<version>` on the CDN, and the release moves
 * that pin in the version-packages PR, before the version is published. Until
 * the Release workflow has published it the CDN answers 404 and the page shows
 * nothing, so the version PR and the merge commit on main went red on every
 * release (0.36.0: CI #241 and #242).
 *
 * With FK_WC_LOCAL_FALLBACK=1 (set by the e2e config only), while the pinned
 * version is not on the CDN, the server serves the workspace build of that same
 * version (packages/wc/dist) instead. Once it is published, the page loads it
 * from the CDN as before.
 */
const CDN = /https:\/\/cdn\.jsdelivr\.net\/npm\/@streamline-pulse\/formkrafter-wc@([\d.]+)\//g
const LOCAL_PREFIX = '/__formkrafter-wc/'
const wcRoot = new URL('../../packages/wc/', import.meta.url)

async function useLocalBuild() {
  if (process.env.FK_WC_LOCAL_FALLBACK !== '1') return false
  const [match] = (await Bun.file(index).text()).matchAll(CDN)
  if (!match) return false
  const [base, pinned] = match

  const probe = await fetch(`${base}dist/formkrafter-wc/formkrafter-wc.esm.js`, { method: 'HEAD' }).catch(
    () => undefined
  )
  if (probe?.ok) return false

  const local = (await Bun.file(new URL('package.json', wcRoot)).json()).version
  if (local !== pinned) {
    console.warn(`formkrafter-wc@${pinned} is not on the CDN and the workspace build is ${local}: loading the CDN anyway`)
    return false
  }
  console.warn(`formkrafter-wc@${pinned} is not on the CDN yet: serving the workspace build of the same version`)
  return true
}

const localBuild = await useLocalBuild()

Bun.serve({
  port,
  async fetch(request) {
    const { pathname } = new URL(request.url)

    if (localBuild && pathname.startsWith(LOCAL_PREFIX)) {
      const file = Bun.file(new URL(pathname.slice(LOCAL_PREFIX.length), wcRoot))
      return (await file.exists()) ? new Response(file) : new Response('Not found', { status: 404 })
    }

    const name = pathname === '/' ? 'index.html' : pathname.slice(1)
    const requested = Bun.file(new URL(name, root))
    const file = (await requested.exists()) ? requested : Bun.file(index)

    if (localBuild && file.name.endsWith('.html')) {
      const html = (await file.text()).replaceAll(CDN, LOCAL_PREFIX)
      return new Response(html, { headers: { 'Content-Type': 'text/html;charset=utf-8' } })
    }
    return new Response(file)
  },
})

console.log(`plain-HTML example on http://localhost:${port}/`)
