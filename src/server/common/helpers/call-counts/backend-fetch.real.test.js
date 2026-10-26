import { createServer } from 'node:http'

import { backendFetch } from './backend-fetch.js'

const listen = async (handler) => {
  const server = createServer(handler)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return server
}

const close = (server) => new Promise((resolve) => server.close(resolve))

describe('backendFetch over a real connection', () => {
  test('sends the request and returns the backend response', async () => {
    const backend = await listen((request, response) => {
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ method: request.method, url: request.url }))
    })
    const { port } = backend.address()

    try {
      const response = await backendFetch(
        `http://127.0.0.1:${port}/notifications`,
        { method: 'PUT', headers: { 'content-type': 'application/json' } }
      )

      expect(await response.json()).toEqual({
        method: 'PUT',
        url: '/notifications'
      })
    } finally {
      await close(backend)
    }
  })

  test('throws the refused connection after trying it once more', async () => {
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
