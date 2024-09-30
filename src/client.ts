/**
 * Space Unicorn Client
 * @module
 */
import { TypedEventTarget } from '@derzade/typescript-event-target'

interface EventMap {
  message: MessageEvent<string | ArrayBuffer>
  close: CloseEvent
  error: Event
}

interface ClientInit {
  send(data: ArrayBuffer | string): void | Promise<void>
}
class Client extends TypedEventTarget<EventMap> {
  #init: ClientInit

  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
   */
  readyState: 0 | 1 | 2 | 3 = 1

  constructor(init: ClientInit) {
    super()
    this.#init = init
  }
  async send(data: ArrayBuffer | string) {
    await this.#init.send(data)
  }
  close() {
    this.readyState = 3
  }
}

/**
 * Use WebSocket
 * @param url URL
 */
export const connectViaWebSocket = async (url: URL): Promise<Client | null> => {
  const wsUrl = new URL(url)
  wsUrl.protocol = wsUrl.protocol === 'http:' ? 'ws:' : 'wss:'
  const ws = new WebSocket(wsUrl)

  const isSuccess = await new Promise<boolean>((resolve) => {
    ws.onopen = () => resolve(true)
    ws.onerror = () => resolve(false)
  })
  if (isSuccess) {
    const client = new Client({
      send(data) {
        ws.send(data)
      },
    })
    client.readyState = 1
    ws.onmessage = (evt) => {
      client.dispatchTypedEvent(
        'message',
        new MessageEvent('message', {
          data: evt.data,
        }),
      )
    }
    ws.onclose = (evt) => {
      client.dispatchTypedEvent(
        'close',
        new CloseEvent('close', {
          reason: evt.reason,
          code: evt.code,
        }),
      )
      client.readyState = 3
    }
    ws.onerror = (_evt) => {
      client.dispatchTypedEvent('error', new Event('error'))
      client.readyState = 3
    }
    return client
  }
  return null
}

/**
 * Connect via Long Polling (HTTP)
 * @param url URL
 */
export const connectViaLongPolling = async (url: URL): Promise<Client> => {
  const { connId }: { connId: string } = await fetch(url, {
    headers: {
      'SpaceUnicorn-Type': 'CONNECT',
    },
  }).then((res) => res.json())

  const client = new Client({
    async send(data) {
      await fetch(url, {
        headers: {
          'SpaceUnicorn-Type': 'SEND',
          'Content-Type': typeof data === 'string' ? 'text/plain' : '',
          'SpaceUnicorn-ConnID': connId,
        },
        method: 'POST',
        body: data,
      }).then((res) => res.json())
    },
  })

  client.readyState = 1

  const pull = async () => {
    const res = await fetch(url, {
      headers: {
        'SpaceUnicorn-Type': 'POLLING',
        'SpaceUnicorn-ConnID': connId,
      },
    })
    const data = await res.formData()
    for (const value of data.values()) {
      client.dispatchTypedEvent(
        'message',
        new MessageEvent('message', {
          data: typeof value === 'string' ? value : await value.arrayBuffer(),
        }),
      )
    }
    if (client.readyState === 3) {
      return
    }
    pull()
  }
  pull()

  return client
}

/**
 * Client
 */
export const connectSpaceUnicorn = async (url: URL): Promise<Client> => {
  const ws = await connectViaWebSocket(url)
  if (ws) {
    return ws
  }
  return await connectViaLongPolling(url)
}
