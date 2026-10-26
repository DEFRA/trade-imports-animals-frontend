import { subscribe, unsubscribe } from 'node:diagnostics_channel'
import { createServer } from 'node:http'
import { Readable } from 'node:stream'

import { backendFetch } from './backend-fetch.js'

const CONNECT_ERROR_CHANNEL = 'undici:client:connectError'

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

  test('connects on the second attempt after the first is refused', async () => {
    const closed = await listen(() => {})
    const { port } = closed.address()
    await close(closed)
    const backend = createServer((request, response) => {
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ url: request.url }))
    })
    const connectErrors = []
    const listenAfterConnectError = ({ error }) => {
      connectErrors.push(error.code)
      backend.listen(port, '127.0.0.1')
    }
    subscribe(CONNECT_ERROR_CHANNEL, listenAfterConnectError)

    try {
      const response = await backendFetch(
        `http://127.0.0.1:${port}/notifications`
      )

      expect({
        connectErrors,
        secondAttemptResponse: await response.json()
      }).toEqual({
        connectErrors: ['ECONNREFUSED'],
        secondAttemptResponse: { url: '/notifications' }
      })
    } finally {
      unsubscribe(CONNECT_ERROR_CHANNEL, listenAfterConnectError)
      await close(backend)
    }
  })
})
