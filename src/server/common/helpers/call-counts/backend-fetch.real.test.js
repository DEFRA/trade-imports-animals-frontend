import { createServer } from 'node:http'
import { vi } from 'vitest'

import { backendFetch } from './backend-fetch.js'

vi.unmock('undici')

const listen = async (handler) => {
  const server = createServer(handler)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return server
}

const close = (server) => new Promise((resolve) => server.close(resolve))

describe('backendFetch over a real connection', () => {
  test('reaches the backend through its connect-bounded agent', async () => {
    const backend = await listen((request, response) => {
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ method: request.method }))
    })
    const { port } = backend.address()

    try {
      const response = await backendFetch(
        `http://127.0.0.1:${port}/notifications`,
        { method: 'PUT', headers: { 'content-type': 'application/json' } }
      )

      expect(await response.json()).toEqual({ method: 'PUT' })
    } finally {
      await close(backend)
    }
  })

  test('tries a refused connection once more, then gives up with the connect error', async () => {
    const closed = await listen(() => {})
    const { port } = closed.address()
    await close(closed)

    await expect(
      backendFetch(`http://127.0.0.1:${port}/notifications`)
    ).rejects.toMatchObject({
      message: 'fetch failed',
      cause: expect.objectContaining({ code: 'ECONNREFUSED' })
    })
  })
})
