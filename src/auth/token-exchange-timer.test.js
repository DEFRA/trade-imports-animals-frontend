import { vi } from 'vitest'

import {
  recordTokenExchange,
  timeTokenExchange,
  TOKEN_EXCHANGE_STARTED_AT_KEY
} from './token-exchange-timer.js'
import { recordEcsLogLines } from '../server/common/test-helpers/ecs-log-lines.js'
import { recordEmfDocuments } from '../server/common/test-helpers/emf-documents.js'

describe('token exchange timer', () => {
  const tokenEndpoint = 'https://idp.example.com/token'
  const tokenExchange = { dependency: 'defra-id', operation: 'token-exchange' }

  const emf = recordEmfDocuments()
  const ecsLog = recordEcsLogLines()

  const recordExchangeTaking = (durationMs, { isAuthenticated }) => {
    const startedAt = 1000
    const clock = vi.spyOn(performance, 'now').mockReturnValue(startedAt)
    const request = { app: {}, auth: { isAuthenticated } }
    timeTokenExchange(tokenEndpoint)(request)
    clock.mockReturnValue(startedAt + durationMs)
    recordTokenExchange(request)
    clock.mockRestore()
  }

  test('timeTokenExchange returns the token endpoint and stamps the start', () => {
    const request = { app: {} }

    const endpoint = timeTokenExchange(tokenEndpoint)(request)

    expect(endpoint).toBe(tokenEndpoint)
    expect(request.app[TOKEN_EXCHANGE_STARTED_AT_KEY]).toEqual(
      expect.any(Number)
    )
  })

  test('recordTokenExchange publishes the time since the stamp as the duration of a successful defra-id token-exchange call, logged as SYN-11', async () => {
    recordExchangeTaking(250, { isAuthenticated: true })

    expect(await emf.onlyExternalCall()).toEqual({
      ...tokenExchange,
      failure: 0
    })
    expect(emf.valuesOf('external.call.duration')).toEqual([250])
    const line = ecsLog.onlyExternalCallLine()
    expect(line['log.level']).toBe('info')
    expect(line.event.duration).toBe(250_000_000)
    expect(line.message).toBe(
      'External call defra-id/token-exchange (SYN-11) success in 250 ms'
    )
  })

  test('recordTokenExchange records an exchange that did not authenticate as a failed defra-id token-exchange call, logged as SYN-11 at warn', async () => {
    recordExchangeTaking(250, { isAuthenticated: false })

    expect(await emf.onlyExternalCall()).toEqual({
      ...tokenExchange,
      failure: 1
    })
    const line = ecsLog.onlyExternalCallLine()
    expect(line['log.level']).toBe('warn')
    expect(line.message).toBe(
      'External call defra-id/token-exchange (SYN-11) failure in 250 ms'
    )
  })

  test('recordTokenExchange publishes and logs no external call when Bell never reached the token call', async () => {
    recordTokenExchange({ app: {}, auth: { isAuthenticated: false } })

    await emf.publishMarkerAndAwaitEarlierPublishes()
    expect(emf.externalCalls()).toEqual([])
    expect(ecsLog.externalCallLines()).toEqual([])
  })
})
