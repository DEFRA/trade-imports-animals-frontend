import hapi from '@hapi/hapi'
import { vi } from 'vitest'

import { backendFetch } from './backend-fetch.js'
import { callCounts } from './call-counts.js'
import { callCountsRoutes } from './call-counts-routes.js'
import { clearCallCountTotals } from './call-count-totals.js'

const BACKEND_URL = 'http://backend.test/notifications'
const INIT = { method: 'PUT', headers: { 'content-type': 'application/json' } }

describe('backendFetch', () => {
  const originalFetch = global.fetch
  let server

  const readRoute = async (path) => {
    const { result } = await server.inject({
      method: 'GET',
      url: '/call-counts'
    })
    return result.routes.find((route) => route.path === path)
  }

  beforeEach(async () => {
    clearCallCountTotals()
    global.fetch = vi.fn().mockResolvedValue({ ok: true })
    server = hapi.server()
    await server.register([callCounts, callCountsRoutes])
  })

  afterEach(async () => {
    global.fetch = originalFetch
    await server.stop({ timeout: 0 })
  })

  test("returns fetch's response and counts one backend call", async () => {
    const response = { ok: true, status: 200 }
    global.fetch.mockResolvedValue(response)
    let received
    server.route({
      method: 'GET',
      path: '/page',
      handler: async () => {
        received = await backendFetch(BACKEND_URL, INIT)
        return 'page'
      }
    })

    await server.inject({ method: 'GET', url: '/page' })
    const { result } = await server.inject({
      method: 'GET',
      url: '/call-counts'
    })

    expect(received).toBe(response)
    expect(result.routes).toEqual([
      expect.objectContaining({ path: '/page', backendCalls: 1 })
    ])
  })

  test('still calls fetch outside a request', async () => {
    await expect(backendFetch(BACKEND_URL, INIT)).resolves.toEqual({
      ok: true
    })
  })

  test('counts every backend call a request makes', async () => {
    server.route({
      method: 'GET',
      path: '/two',
      handler: async () => {
        await backendFetch(BACKEND_URL, INIT)
        await backendFetch(BACKEND_URL, INIT)
        return 'page'
      }
    })

    await server.inject({ method: 'GET', url: '/two' })

    expect((await readRoute('/two')).backendCalls).toBe(2)
  })

  test('counts a backend call whose fetch rejects', async () => {
    global.fetch.mockRejectedValueOnce(new Error('down'))
    server.route({
      method: 'GET',
      path: '/failing',
      handler: async () => {
        try {
          await backendFetch(BACKEND_URL, INIT)
        } catch {
          // the page still renders when the backend is down
        }
        return 'page'
      }
    })

    await server.inject({ method: 'GET', url: '/failing' })

    expect((await readRoute('/failing')).backendCalls).toBe(1)
  })

  test('keeps the counts of overlapping requests apart', async () => {
    let releaseA
    let releaseB
    const gateA = new Promise((resolve) => {
      releaseA = resolve
    })
    const gateB = new Promise((resolve) => {
      releaseB = resolve
    })
    const callBackendInterleaved = async (times) => {
      for (let call = 0; call < times; call++) {
        await backendFetch(BACKEND_URL, INIT)
        await Promise.resolve()
      }
    }
    server.route([
      {
        method: 'GET',
        path: '/a',
        handler: async () => {
          await gateA
          await callBackendInterleaved(2)
          return 'a'
        }
      },
      {
        method: 'GET',
        path: '/b',
        handler: async () => {
          await gateB
          await callBackendInterleaved(3)
          return 'b'
        }
      }
    ])

    const requests = Promise.all([
      server.inject({ method: 'GET', url: '/a' }),
      server.inject({ method: 'GET', url: '/b' })
    ])
    releaseA()
    releaseB()
    await requests

    expect(await readRoute('/a')).toEqual(
      expect.objectContaining({ backendCalls: 2, pageRequests: 1 })
    )
    expect(await readRoute('/b')).toEqual(
      expect.objectContaining({ backendCalls: 3, pageRequests: 1 })
    )
  })
})
