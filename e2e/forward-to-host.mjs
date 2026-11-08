// Run inside the Linux snapshot container: serves the example ports on
// localhost and relays them to the host. The pages then load from a secure
// context, as in CI; on http://host.docker.internal the builder fails,
// since crypto.randomUUID exists only in secure contexts.
import net from 'node:net'

for (const port of [4179, 4180, 4181, 4182]) {
  net
    .createServer((client) => {
      const upstream = net.connect(port, 'host.docker.internal')
      client.pipe(upstream).pipe(client)
      upstream.on('error', () => client.destroy())
      client.on('error', () => upstream.destroy())
    })
    .listen(port, '127.0.0.1')
}
