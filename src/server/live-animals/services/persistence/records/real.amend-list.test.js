import { beforeEach, describe, expect, test, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import { IN_PROGRESS, SUBMITTED } from '../../../engine/persistence/records.js'
import { records } from './real.js'

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

const fulfilmentsUrl = 'http://localhost:8085/fulfilments'
const owner = { sub: 'user-1', organisation: '' }

const expectOwnerHeaders = (request) => {
  expect(request.headers.get('X-Owner-Id')).toBe(owner.sub)
  expect(request.headers.get('X-Owner-Organisation')).toBe('')
}

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

    const amended = await records.amend('GBN-1', owner)

    const [request] = fetchMocker.requests()
    expect(request.url).toBe(`${fulfilmentsUrl}/GBN-1/amend`)
    expect(request.method).toBe('POST')
    expectOwnerHeaders(request)
    expect(amended.status).toBe(IN_PROGRESS)
    expect(amended.submittedAt).toBeNull()
    expect(amended.createdAt).toBe('2026-07-14T09:00:00')
  })

  test('Should surface a failed amend as an error carrying the response status', async () => {
    fetchMocker.mockResponse('Conflict', { status: 409 })

    await expect(records.amend('GBN-1', owner)).rejects.toThrow(
      /Failed to amend fulfilment: 409/
    )
  })
})

describe('real records adapter — owner-scoped paged list', () => {
  beforeEach(() => {
    fetchMocker.resetMocks()
  })

  test('Should issue one owner-scoped first-page GET and map summaries to dashboard rows', async () => {
    fetchMocker.mockResponse(
      JSON.stringify({
        page: 1,
        size: 20,
        totalElements: 2,
        totalPages: 1,
        items: [
          fulfilment('GBN-1', 'IN_PROGRESS'),
          fulfilment('GBN-2', 'SUBMITTED')
        ]
      })
    )

    const listed = await records.list({
      journeyIds: ['session-id-is-ignored-in-real-mode'],
      owner
    })

    const [request] = fetchMocker.requests()
    expect(request.url).toBe(`${fulfilmentsUrl}?page=1&sort=createdAt,desc`)
    expect(request.method).toBe('GET')
    expectOwnerHeaders(request)
    expect(listed).toEqual([
      {
        journeyId: 'GBN-1',
        status: IN_PROGRESS,
        createdAt: '2026-07-14T09:00:00',
        submittedAt: null
      },
      {
        journeyId: 'GBN-2',
        status: SUBMITTED,
        createdAt: '2026-07-14T09:00:00',
        submittedAt: '2026-07-14T10:00:00'
      }
    ])
  })

  test('Should implement has with an exact-id canonical GET', async () => {
    fetchMocker.mockResponses(
      [JSON.stringify(fulfilment('GBN-1', 'IN_PROGRESS')), { status: 200 }],
      ['Not Found', { status: 404 }]
    )

    expect(await records.has('GBN-1', owner)).toBe(true)
    expect(await records.has('GBN-GONE', owner)).toBe(false)
    const requests = fetchMocker.requests()
    expect(requests.map(({ method, url }) => ({ method, url }))).toEqual([
      { method: 'GET', url: `${fulfilmentsUrl}/GBN-1` },
      { method: 'GET', url: `${fulfilmentsUrl}/GBN-GONE` }
    ])
    requests.forEach(expectOwnerHeaders)
  })
})
