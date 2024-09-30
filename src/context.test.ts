import { assertEquals } from '@std/assert'
import { UnicornContext } from './context.ts'

Deno.test('UnicornContext send', async () => {
  const { promise, resolve } = Promise.withResolvers<string | ArrayBuffer>()
  const ctx = new UnicornContext({
    send(data) {
      resolve(data)
    },
    close() {},
  })
  ctx.send('hello world')
  assertEquals(await promise, 'hello world')
})
