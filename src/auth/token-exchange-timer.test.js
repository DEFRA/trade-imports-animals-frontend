import { vi } from 'vitest'
import { Metrics } from '@defra/cdp-metrics'

import {
  recordTokenExchange,
  timeTokenExchange
} from './token-exchange-timer.js'
import { readEmfDocuments } from '../server/common/test-helpers/emf-documents.js'

vi.mock('../server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn()
  })
}))

describe('token exchange timer', () => {
  let logSpy
  let getMetricsLoggerSpy

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    getMetricsLoggerSpy = vi.spyOn(Metrics.prototype, 'getMetricsLogger')
  })

  afterEach(() => {
    getMetricsLoggerSpy.mockRestore()
    logSpy.mockRestore()
  })

  test('timeTokenExchange returns the token endpoint and stamps the start', () => {
    const request = { app: {} }

    const endpoint = timeTokenExchange('https://idp.example.com/token')(request)

    expect(endpoint).toBe('https://idp.example.com/token')
    expect(request.app.defraIdTokenExchangeStartedAt).toEqual(
      expect.any(Number)
    )
  })

  test.each([
    { isAuthenticated: true, expectedFailure: 0 },
    { isAuthenticated: false, expectedFailure: 1 }
  ])(
    'recordTokenExchange emits the exchange with failure $expectedFailure when isAuthenticated is $isAuthenticated',
    async ({ isAuthenticated, expectedFailure }) => {
      const request = {
        app: { defraIdTokenExchangeStartedAt: performance.now() },
        auth: { isAuthenticated }
      }

      recordTokenExchange(request)

      await vi.waitFor(() => expect(readEmfDocuments(logSpy)).toHaveLength(1))
      const [document] = readEmfDocuments(logSpy)
      expect(document.Dependency).toBe('defra-id')
      expect(document.Operation).toBe('token-exchange')
      expect(document.Interface).toBe('SYN-11')
      expect(document.ExternalCallFailure).toBe(expectedFailure)
    }
  )

  test('recordTokenExchange emits nothing when Bell never reached the token call', () => {
    recordTokenExchange({ app: {}, auth: { isAuthenticated: false } })

    expect(getMetricsLoggerSpy).not.toHaveBeenCalled()
    expect(readEmfDocuments(logSpy)).toHaveLength(0)
  })
})
