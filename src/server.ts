/**
 * SpaceUnicorn server source code.
 * @module
 */

import type { Context, TypedResponse } from '@hono/hono'
import type { UpgradeWebSocket, WSContext } from '@hono/hono/ws'
import { UnicornContext } from './context.ts'

interface PollingConnection {
  messages: (string | ArrayBuffer)[]
  events: UnicornEvents
  onSent?: () => void
  ctx: UnicornContext
  timeoutId?: number
}

/**
 * SpaceUnicorn Connection Store
 */
export class ConnectionStore {
  #map: Map<string, PollingConnection>
  constructor() {
    this.#map = new Map()
  }
  #createTimeout(id: string): void {
    const conn = this.#map.get(id)
    if (!conn) {
      return
    }
    conn.timeoutId && clearTimeout(conn.timeoutId)
    conn.timeoutId = setTimeout(() => {
      conn.ctx.close()
    }, 5000)
  }
  add(events: UnicornEvents): string {
    const id = crypto.randomUUID()
    const conn: PollingConnection = {
      messages: [],
      events,
      ctx: new UnicornContext({
        send(data) {
          conn.messages.push(data)
          conn.onSent?.()
        },
        close: () => {
          this.close(id)
        },
      }),
    }
    this.#map.set(id, conn)
    events.onOpen?.(new Event('open'), conn.ctx)
    this.#createTimeout(id)
    return id
  }
  send(id: string, data: string | ArrayBuffer): boolean {
    const conn = this.#map.get(id)
    if (!conn) {
      return false
    }
    conn.events.onMessage?.(
      new MessageEvent('message', {
        data,
      }),
      conn.ctx,
    )
    this.#createTimeout(id)
    return true
  }
  pull(
    id: string,
  ): Promise<(string | ArrayBuffer)[]> | null | (string | ArrayBuffer)[] {
    const conn = this.#map.get(id)
    if (!conn) {
      return null
    }
    if (conn.messages.length !== 0) {
      const result = conn.messages
      conn.messages = []
      this.#createTimeout(id)
      return result
    }
    this.#createTimeout(id)
    return new Promise((resolve) => {
      conn.onSent = () => {
        this.#createTimeout(id)
        resolve(conn.messages)
        conn.messages = []
        conn.onSent = void 0
      }
      // Timeout
      setTimeout(() => {
        resolve([])
        this.#createTimeout(id)
        conn.onSent = void 0
      }, 1000)
    })
  }
  close(id: string): boolean {
    const conn = this.#map.get(id)
    if (!conn) {
      return false
    }
    conn.events.onClose?.(new CloseEvent('close'), conn.ctx)
    this.#map.delete(id)
    return true
  }
}

/**
 * Events
 */
export interface UnicornEvents {
  onOpen?: (event: Event, unicorn: UnicornContext) => void
  onMessage?: (
    event: MessageEvent<string | ArrayBuffer>,
    unicorn: UnicornContext,
  ) => void
  onClose?: (event: CloseEvent, unicorn: UnicornContext) => void
  onError?: (event: Event, unicorn: UnicornContext) => void
}

/**
 * Space Unicorn!!
 * @param c Hono Context
 * @param upgradeWebSocket UpgradeWebSocket interface
 * @param events Your own events
 * @returns An response
 */
export const spaceUnicorn = async (
  c: Context,
  upgradeWebSocket: UpgradeWebSocket,
  connectionStore: ConnectionStore,
  events: UnicornEvents,
): Promise<
  // deno-lint-ignore ban-types
  Response & (TypedResponse<{ __space: 'unicorn' }> | (unknown & {}))
> => {
  if (c.req.header('Upgrade') === 'websocket') {
    // WebSocket mode
    const res = await upgradeWebSocket((_c) => {
      let wsCtx: WSContext
      const ctx = new UnicornContext({
        send(data) {
          wsCtx.send(data)
        },
        close(code, reason) {
          wsCtx.close(code, reason)
        },
      })
      return {
        onOpen(evt, ws) {
          wsCtx = ws
          events.onOpen?.(evt, ctx)
        },
        async onMessage(evt, ws) {
          wsCtx = ws
          const event = new MessageEvent<string | ArrayBuffer>('message', {
            data: typeof evt.data === 'string'
              ? evt.data
              : evt.data instanceof ArrayBuffer
              ? evt.data
              : evt.data instanceof Blob
              ? await evt.data.arrayBuffer()
              : evt.data instanceof SharedArrayBuffer
              ? new Uint8Array(evt.data).buffer
              : void 0,
          })

          events.onMessage?.(event, ctx)
        },
        onClose(evt, ws) {
          wsCtx = ws
          events.onClose?.(evt, ctx)
        },
        onError(evt, ws) {
          wsCtx = ws
          events.onError?.(evt, ctx)
        },
      }
    })(c, () => {
      throw new Error('UpgradeWebSocket throws next()')
    })
    if (!res) {
      throw new Error('UpgradeWebSocket did not return Resppnse')
    }
    return res
  }

  // Long polling
  const unicornType = c.req.header('SpaceUnicorn-Type')
  switch (unicornType) {
    case 'CONNECT': {
      // Start connecting
      const connId = connectionStore.add(events)
      return c.json({
        success: true,
        connId,
      })
    }
    case 'POLLING': {
      // Polling
      const id = c.req.header('spaceunicorn-connid')
      if (!id) {
        return c.json('Invalid Request', 400)
      }
      const data = await connectionStore.pull(id)
      if (!data) {
        return c.json({ success: false, closed: true }, 400)
      }
      const formData = new FormData()
      for (let i = 0; i < data.length; i++) {
        const value = data[i]
        formData.append(
          i.toString(),
          typeof value === 'string' ? value : new Blob([value]),
        )
      }
      return new Response(formData)
    }
    case 'SEND': {
      const id = c.req.header('spaceunicorn-connid')
      if (!id) {
        return c.json({
          success: false,
          closed: true,
        }, 400)
      }
      const data =
        await (c.req.header('Content-Type') === 'text/plain'
          ? c.req.text()
          : c.req.arrayBuffer())
      const sent = connectionStore.send(id, data)
      if (!sent) {
        return c.json('Invalid Request', 400)
      }
      return c.json({ success: true })
    }
    default:
      return c.json('Invalid Request', 400)
  }
}
