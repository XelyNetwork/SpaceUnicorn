/**
 * Unicorn Context
 * @module
 */

/**
 * Unicorn Context init
 */
export interface UnicornContextInit {
  send(data: string | ArrayBuffer): void | Promise<void>
  close(code?: number, reason?: string): void | Promise<void>
}

/**
 * Unicorn Context
 */
export class UnicornContext {
  #init: UnicornContextInit
  constructor(init: UnicornContextInit) {
    this.#init = init
  }
  async send(data: string | ArrayBuffer | Uint8Array | Blob): Promise<void> {
    await this.#init.send(
      typeof data === 'string'
        ? data
        : data instanceof ArrayBuffer
        ? data
        : data instanceof Uint8Array
        ? data.buffer
        : await data.arrayBuffer(),
    )
  }
  async close(code?: number, reason?: string) {
    await this.#init.close(code, reason)
  }
}
