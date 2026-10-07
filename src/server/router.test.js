import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'

import { createServer } from './server.js'
import { config } from '../config/config.js'
import { statusCodes } from './common/constants/status-codes.js'
import { DEFAULT_SET_BASE } from './router.js'

const AUTH_ENABLED_KEY = 'auth.enabled'
const ENDPOINT_ENABLED_KEY = 'callCounts.endpoint.enabled'
const CALL_COUNTS_URL = '/call-counts'

describe('#router auth gating', () => {
  let server

  beforeAll(async () => {
    config.set(AUTH_ENABLED_KEY, false)
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    config.set(AUTH_ENABLED_KEY, true)
    await server.stop({ timeout: 0 })
  })

  test('the root redirect is not registered when auth is disabled', async () => {
    const { statusCode } = await server.inject({ method: 'GET', url: '/' })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('the dashboard is not registered when auth is disabled', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: DEFAULT_SET_BASE
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('health remains available when auth is disabled', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/health'
    })

    expect(statusCode).toBe(statusCodes.ok)
  })
})

describe('#router call counts', () => {
  const originalEndpointEnabled = config.get(ENDPOINT_ENABLED_KEY)
  let server

  const startServer = async (endpointEnabled) => {
    config.set(AUTH_ENABLED_KEY, false)
    config.set(ENDPOINT_ENABLED_KEY, endpointEnabled)
    server = await createServer()
    await server.initialize()
  }

  afterAll(() => {
    config.set(ENDPOINT_ENABLED_KEY, originalEndpointEnabled)
    config.set(AUTH_ENABLED_KEY, true)
  })

  afterEach(async () => {
    await server.stop({ timeout: 0 })
  })

  test('serves the totals, counting a page request but not the health check', async () => {
    await startServer(true)
    await server.inject({ method: 'DELETE', url: CALL_COUNTS_URL })

    await server.inject({ method: 'GET', url: '/health' })
    await server.inject({ method: 'GET', url: '/no-such-page' })
    await server.inject({ method: 'GET', url: CALL_COUNTS_URL })
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: CALL_COUNTS_URL
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result.totals.pageRequests).toBe(1)
    expect(result.routes).toEqual([
      expect.objectContaining({
        method: 'get',
        path: '/{p*}',
        pageRequests: 1
      })
    ])
  })

  test('answers 404 when the endpoint is switched off', async () => {
    await startServer(false)

    const { statusCode } = await server.inject({
      method: 'GET',
      url: CALL_COUNTS_URL
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })
})
