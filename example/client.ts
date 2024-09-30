import type { app } from './deno.ts'
import { hc } from '@hono/hono/client'
import { connectSpaceUnicorn } from '@xely/spaceunicorn/client'

const client = hc<typeof app>('http://localhost:3030')

const unicorn = await connectSpaceUnicorn(client.spaceunicorn.$url())

unicorn.addEventListener('message', c => {
  console.log(c.data)
})
unicorn.send('hello world')
