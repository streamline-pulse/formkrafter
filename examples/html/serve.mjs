/**
 * A dependency-free static server for `public/`.
 *
 * The point of this example is that it needs no build tooling, so it would be
 * odd to pull in a dev server just to look at it. Bun can serve the directory
 * in a few lines.
 */
const port = Number(process.env.PORT ?? 4181)
const root = new URL('./public/', import.meta.url)

Bun.serve({
  port,
  async fetch(request) {
    const { pathname } = new URL(request.url)
    const name = pathname === '/' ? 'index.html' : pathname.slice(1)
    const file = Bun.file(new URL(name, root))

    if (await file.exists()) return new Response(file)
    return new Response(Bun.file(new URL('index.html', root)))
  },
})

console.log(`plain-HTML example on http://localhost:${port}/`)
