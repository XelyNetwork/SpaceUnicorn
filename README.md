# SpaceUnicorn

Realtime connection for Hono.

## Why don't use WebSocket??

「全員が全員 WebSocket 使えると思うなよ」

## Usage
To install
```shell
deno add @xely/spaceunicorn
bunx jsr add @xely/spaceunicorn
pnpm dlx jsr add @xely/spaceunicorn
yarn dlx jsr add @xely/spaceunicorn
npx jsr add @xely/spaceunicorn
```

## Server

If there is a Hono WebSocket adapter for runtime that you want to use, SpaceUnicorn Works.
Deno example, 
```ts
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
      }
    })
  })

Deno.serve({
  port: 3030
}, app.fetch)
```
If you suddenly want to use Cloudflare workers??
```diff
- import { upgradeWebSocket } from '@hono/hono/deno'
+ import { upgradeWebSocket } from '@hono/hono/cloudflare-workers'
```

### Client

```ts
import type { app } from './app'
import { hc } from '@hono/client'
import { connectSpaceUnicorn } from '@xely/spaceunicorn/client'

const client = hc<typeof app>('http://localhost:3030')

const unicorn = await connectSpaceUnicorn(client.spaceunicorn.$url()) // Tell URL

unicorn.addEventListener('message', c => {
  console.log(c.data)
})
unicorn.send('hello world')
```
Simple.
