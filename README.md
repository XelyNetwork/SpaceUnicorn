<img align="right" src="https://emoji2svg.deno.dev/api/🦄" width="180"></img>
# SpaceUnicorn

Realtime connection for Hono.
It's also a simple Socket.IO alternative.
SpaceUnicorn uses WebSockets, but SpaceUnicorn works without WebSockets! SpaceUnicorn use Long Polling if users can't use WebSockets.

Some proxies in workplaces and schools blocks WebSockets. By using SpaceUnicorn, SpaceUnicorn gives these users a real-time experience. Not only an environment where WebSocket can be used!

## Usage

SpaceUnicorn is published in [JSR](https://jsr.io/@xely/spaceunicorn).
You can use SpaceUnicorn as server using some runtimes such as Deno, Bun, Cloudflare Workers, and Node.js!
If you want to use SpaceUnicorn as a client, it works in not only browsers.

To install:
```shell
deno add @xely/spaceunicorn # Deno
bunx jsr add @xely/spaceunicorn # Bun
pnpm dlx jsr add @xely/spaceunicorn # pnpm
yarn dlx jsr add @xely/spaceunicorn # yarn
npx jsr add @xely/spaceunicorn # npm
```

## Server

You are required to install [Hono](https://hono.dev).
If there is a Hono WebSocket adapter for runtime that you want to use,
SpaceUnicorn Works. Deno example,

```ts
import { ConnectionStore, spaceUnicorn } from '@xely/spaceunicorn'
import { Hono } from 'hono'
import { upgradeWebSocket } from 'hono/deno'

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

Deno.serve({
  port: 3030,
}, app.fetch)
```

If you suddenly want to use other runtimes??

```diff
- import { upgradeWebSocket } from '@hono/hono/deno'
+ import { upgradeWebSocket } from 'hono/cloudflare-workers' // Cloudflare Workers

+ import { createBunWebSocket } from 'hono/bun'
+ const { websocket, upgradeWebSocket } = createBunWebSocket() // Bun

+ import { upgradeWebSocket } from '@hono/node-server' // Node.js
```

### Client

You can use `connectSpaceUnicorn` API.

Example using Hono RPC:
```ts
import type { app } from './app'
import { hc } from 'hono/client'
import { connectSpaceUnicorn } from '@xely/spaceunicorn/client'

const client = hc<typeof app>('http://localhost:3030')

const unicorn = await connectSpaceUnicorn(client.spaceunicorn.$url()) // Tell URL

unicorn.addEventListener('message', (c) => {
  console.log(c.data)
})
unicorn.send('hello world')
```

Simple.
