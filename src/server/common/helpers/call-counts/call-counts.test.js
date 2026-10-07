import hapi from '@hapi/hapi'
import { vi } from 'vitest'

import { config } from '../../../../config/config.js'
import { recordPageRequestInBackground } from './page-request-metrics.js'
import {
  callCounts,
  countBackendCall,
  countExternalCall,
  countSessionResolution
} from './call-counts.js'
import { callCountsRoutes } from './call-counts-routes.js'
import { clearCallCountTotals } from './call-count-totals.js'
import { statusCodes } from '../../constants/status-codes.js'

vi.mock('./page-request-metrics.js', () => ({
  recordPageRequestInBackground: vi.fn()
}))

const ROUTE_PATH = '/some-page'
const METRICS_ENABLED_KEY = 'callCounts.metrics.enabled'

const buildServer = async () => {
  const server = hapi.server()
  await server.register([callCounts, callCountsRoutes])
  server.route([
    {
      method: 'GET',
      path: ROUTE_PATH,
      handler: (request) => {
        countBackendCall()
        countBackendCall()
        countExternalCall({ dependency: 'defra-id', operation: 'jwks' })
        countSessionResolution(request)
        return 'page'
      }
    },
    { method: 'GET', path: '/health', handler: () => 'ok' },
    {
      method: 'GET',
      path: `${config.get('assetPath')}/{param*}`,
      handler: () => 'asset'
    }
  ])
  return server
}

const readTotals = async (server) => {
  const { result } = await server.inject({ method: 'GET', url: '/call-counts' })
  return result
}

describe('call counts', () => {
  let server

  beforeEach(async () => {
    clearCallCountTotals()
    server = await buildServer()
  })

  afterEach(async () => {
    await server.stop({ timeout: 0 })
  })

  test('adds up the calls a route made while handling a page request', async () => {
    await server.inject({ method: 'GET', url: ROUTE_PATH })

    const { totals, routes } = await readTotals(server)

    expect(routes).toEqual([
      {
        method: 'get',
        path: ROUTE_PATH,
        pageRequests: 1,
        backendCalls: 2,
        sessionResolutions: 1,
        externalCalls: { 'defra-id': { jwks: 1 } }
      }
    ])
    expect(totals).toEqual({
      pageRequests: 1,
      backendCalls: 2,
      sessionResolutions: 1,
      externalCalls: { 'defra-id': { jwks: 1 } }
    })
  })

  test('adds two requests to one route together', async () => {
    await server.inject({ method: 'GET', url: ROUTE_PATH })
    await server.inject({ method: 'GET', url: ROUTE_PATH })

    const { routes } = await readTotals(server)

    expect(routes).toHaveLength(1)
    expect(routes[0]).toEqual(
      expect.objectContaining({
        pageRequests: 2,
        backendCalls: 4,
        sessionResolutions: 2,
        externalCalls: { 'defra-id': { jwks: 2 } }
      })
    )
  })

  test('never counts the health check or the call counts endpoint', async () => {
    await server.inject({ method: 'GET', url: '/health' })
    await server.inject({
      method: 'GET',
      url: `${config.get('assetPath')}/app.css`
    })
    await readTotals(server)

    const { totals, routes } = await readTotals(server)

    expect(totals.pageRequests).toBe(0)
    expect(routes).toEqual([])
  })

  describe('page request metrics', () => {
    const originalEnabled = config.get(METRICS_ENABLED_KEY)

    beforeEach(() => {
      recordPageRequestInBackground.mockClear()
    })

    afterEach(() => {
      config.set(METRICS_ENABLED_KEY, originalEnabled)
    })

    test('writes a page request metric only when callCounts.metrics.enabled is on', async () => {
      config.set(METRICS_ENABLED_KEY, true)
      await server.inject({ method: 'GET', url: ROUTE_PATH })

      expect(recordPageRequestInBackground).toHaveBeenCalledTimes(1)
      expect(recordPageRequestInBackground).toHaveBeenCalledWith(
        expect.objectContaining({ backendCalls: 2, sessionResolutions: 1 })
      )

      config.set(METRICS_ENABLED_KEY, false)
      await server.inject({ method: 'GET', url: ROUTE_PATH })

      expect(recordPageRequestInBackground).toHaveBeenCalledTimes(1)
    })
  })

  test('DELETE clears the totals and restarts the since time', async () => {
    await server.inject({ method: 'GET', url: ROUTE_PATH })
    const before = await readTotals(server)

    await new Promise((resolve) => setTimeout(resolve, 5))
    const cleared = await server.inject({
      method: 'DELETE',
      url: '/call-counts'
    })
    const after = await readTotals(server)

    expect(cleared.statusCode).toBe(statusCodes.noContent)
    expect(after.totals.pageRequests).toBe(0)
    expect(after.routes).toEqual([])
    expect(after.since > before.since).toBe(true)
  })

  test('counting outside any request does nothing and does not throw', () => {
    expect(() => {
      countBackendCall()
      countExternalCall({ dependency: 'defra-id', operation: 'jwks' })
      countSessionResolution({})
      countSessionResolution(undefined)
    }).not.toThrow()
  })
})
