import { beforeEach, describe, expect, test, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import { IN_PROGRESS, SUBMITTED } from '../../../engine/persistence/records.js'
import { records } from './real.js'

// List remains session-scoped: the adapter loads only the canonical fulfilment
// ids it is handed and never performs an unscoped backend browse.

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

const fulfilmentsUrl = 'http://localhost:8085/fulfilments'

const fulfilment = (id, status) => ({
  id,
  status,
  createdAt: '2026-07-14T09:00:00',
  submittedAt: status === 'SUBMITTED' ? '2026-07-14T10:00:00' : null,
  fulfilment: []
})

describe('real records adapter — amend', () => {
  beforeEach(() => {
    fetchMocker.resetMocks()
  })

  test('Should POST the amend endpoint and marshal a writable in-progress record', async () => {
    fetchMocker.mockResponse(JSON.stringify(fulfilment('GBN-1', 'IN_PROGRESS')))

    const amended = await records.amend('GBN-1')

    const [request] = fetchMocker.requests()
    expect(request.url).toBe(`${fulfilmentsUrl}/GBN-1/amend`)
    expect(request.method).toBe('POST')
    expect(amended.status).toBe(IN_PROGRESS)
    expect(amended.submittedAt).toBeNull()
    expect(amended.createdAt).toBe('2026-07-14T09:00:00')
  })

  test('Should surface a failed amend as an error carrying the response status', async () => {
    fetchMocker.mockResponse('Conflict', { status: 409 })

    await expect(records.amend('GBN-1')).rejects.toThrow(
      /Failed to amend fulfilment: 409/
    )
  })
})

describe('real records adapter — session-scoped list', () => {
  beforeEach(() => {
    fetchMocker.resetMocks()
  })

  test('Should GET exactly the handed references and marshal each record', async () => {
    fetchMocker.mockResponse((request) =>
      request.url.endsWith('/GBN-1')
        ? JSON.stringify(fulfilment('GBN-1', 'IN_PROGRESS'))
        : JSON.stringify(fulfilment('GBN-2', 'SUBMITTED'))
    )

    const listed = await records.list({ journeyIds: ['GBN-1', 'GBN-2'] })

    expect(fetchMocker.requests().map((request) => request.url)).toEqual([
      `${fulfilmentsUrl}/GBN-1`,
      `${fulfilmentsUrl}/GBN-2`
    ])
    expect(
      listed.map(({ journeyId, status }) => ({ journeyId, status }))
    ).toEqual([
      { journeyId: 'GBN-1', status: IN_PROGRESS },
      { journeyId: 'GBN-2', status: SUBMITTED }
    ])
    expect(listed[1].submittedAt).toBe('2026-07-14T10:00:00')
  })

  test('Should skip references the backend no longer knows', async () => {
    fetchMocker.mockResponse((request) =>
      request.url.endsWith('/GBN-GONE')
        ? { status: 404, body: 'Not Found' }
        : JSON.stringify(fulfilment('GBN-1', 'IN_PROGRESS'))
    )

    const listed = await records.list({ journeyIds: ['GBN-1', 'GBN-GONE'] })

    expect(listed.map((journey) => journey.journeyId)).toEqual(['GBN-1'])
  })

  test('Should issue no fetch for an empty reference set', async () => {
    expect(await records.list({ journeyIds: [] })).toEqual([])
    expect(fetchMocker.requests()).toHaveLength(0)
  })

  test('Should implement has with an exact-id canonical GET', async () => {
    fetchMocker.mockResponses(
      [JSON.stringify(fulfilment('GBN-1', 'IN_PROGRESS')), { status: 200 }],
      ['Not Found', { status: 404 }]
    )

    expect(await records.has('GBN-1')).toBe(true)
    expect(await records.has('GBN-GONE')).toBe(false)
    expect(
      fetchMocker.requests().map(({ method, url }) => ({ method, url }))
    ).toEqual([
      { method: 'GET', url: `${fulfilmentsUrl}/GBN-1` },
      { method: 'GET', url: `${fulfilmentsUrl}/GBN-GONE` }
    ])
  })
})
