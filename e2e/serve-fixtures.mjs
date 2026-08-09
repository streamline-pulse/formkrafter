const port = Number(process.env.PORT ?? 4182)
const fixtures = new URL('./fixtures/', import.meta.url)
const dist = new URL('../packages/wc/dist/formkrafter-wc/', import.meta.url)

Bun.serve({
  port,
  async fetch(request) {
    const { pathname } = new URL(request.url)
    const name = pathname === '/' ? 'hostile.html' : pathname.slice(1)
    const file = name.startsWith('dist/')
      ? Bun.file(new URL(name.slice(5), dist))
      : Bun.file(new URL(name, fixtures))

    if (await file.exists()) return new Response(file)
    return new Response('not found', { status: 404 })
  },
})

console.log(`e2e fixtures on http://localhost:${port}/`)
