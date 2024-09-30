import { ConnectionStore, spaceUnicorn } from '@xely/spaceunicorn'
import { Hono } from '@hono/hono'
import { upgradeWebSocket } from '@hono/hono/deno'

const connectionStore = new ConnectionStore()

const app = new Hono()
  .all('/spaceunicorn', (c) => {
    return spaceUnicorn(c, upgradeWebSocket, connectionStore, {
      onOpen() {
        console.log('Opened!')
      },
      onMessage(evt, unicorn) {
        unicorn.send(evt.data)
      },
    })
  })

export { app }

Deno.serve({
  port: 3030,
}, app.fetch)
