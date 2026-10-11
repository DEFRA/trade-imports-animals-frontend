import { createServer } from 'node:http'
import { Readable } from 'node:stream'
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

  test('sends a form with a file as multipart, filename and bytes intact', async () => {
    const received = {}
    const backend = await listen((request, response) => {
      const chunks = []
      request.on('data', (chunk) => chunks.push(chunk))
      request.on('end', () => {
        received.contentType = request.headers['content-type']
        received.body = Buffer.concat(chunks).toString('utf8')
        response.writeHead(204)
        response.end()
      })
    })
    const { port } = backend.address()
    const formData = new FormData()
    formData.append(
      'file',
      new Blob(['%PDF-1.4 bytes'], { type: 'application/pdf' }),
      'certificate.pdf'
    )

    try {
      await backendFetch(`http://127.0.0.1:${port}/document-uploads/u-1/file`, {
        method: 'POST',
        body: formData
      })

      expect({
        multipart: received.contentType.startsWith('multipart/form-data'),
        filename: received.body.includes('filename="certificate.pdf"'),
        partType: received.body.includes('Content-Type: application/pdf'),
        bytes: received.body.includes('%PDF-1.4 bytes')
      }).toEqual({
        multipart: true,
        filename: true,
        partType: true,
        bytes: true
      })
    } finally {
      await close(backend)
    }
  })

  test("streams a file's bytes through Readable.fromWeb, as a download does", async () => {
    const backend = await listen((_request, response) => {
      response.writeHead(200, { 'content-type': 'application/pdf' })
      response.end('%PDF-1.4 stored bytes')
    })
    const { port } = backend.address()

    try {
      const response = await backendFetch(
        `http://127.0.0.1:${port}/document-uploads/u-1/file`,
        { method: 'GET' }
      )
      const chunks = []
      for await (const chunk of Readable.fromWeb(response.body)) {
        chunks.push(chunk)
      }

      expect(Buffer.concat(chunks).toString('utf8')).toBe(
        '%PDF-1.4 stored bytes'
      )
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
