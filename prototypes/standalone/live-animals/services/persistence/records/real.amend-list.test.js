import { beforeEach, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import { IN_PROGRESS, SUBMITTED } from '../../../engine/persistence/records.js'
import { records } from './real.js'

// M3-18 dashboard surface. Amend is the sanctioned unfreeze transition: the
// adapter POSTs the backend's /notifications/{ref}/amend endpoint and the
// backend's AMEND status marshals to a writable in-progress record. List is
// session-scoped by design — the adapter loads ONLY the references it is
// handed (no unscoped backend browse; resume-by-user was removed because a
// global list leaks other users' notifications). Pinned at the HTTP boundary.

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

const notificationsUrl = 'http://localhost:8085/notifications'

const notification = (referenceNumber, status) => ({
  referenceNumber,
  status,
  created: '2026-07-14T09:00:00',
  updated: '2026-07-14T10:00:00'
})

describe('real records adapter — amend', () => {
  beforeEach(() => {
    fetchMocker.resetMocks()
  })

  it('Should POST the amend endpoint and marshal AMEND as a writable in-progress record', async () => {
    fetchMocker.mockResponse(JSON.stringify(notification('GBN-1', 'AMEND')))

    const amended = await records.amend('GBN-1')

    const [request] = fetchMocker.requests()
    expect(request.url).toBe(`${notificationsUrl}/GBN-1/amend`)
    expect(request.method).toBe('POST')
    expect(amended.status).toBe(IN_PROGRESS)
    expect(amended.submittedAt).toBeNull()
    expect(amended.createdAt).toBe('2026-07-14T09:00:00')
  })

  it('Should surface a failed amend as an error carrying the response status', async () => {
    fetchMocker.mockResponse('Conflict', { status: 409 })

    await expect(records.amend('GBN-1')).rejects.toThrow(
      /Failed to amend notification: 409/
    )
  })
})

describe('real records adapter — session-scoped list', () => {
  beforeEach(() => {
    fetchMocker.resetMocks()
  })

  it('Should GET exactly the handed references and marshal each record', async () => {
    fetchMocker.mockResponse((request) =>
      request.url.endsWith('/GBN-1')
        ? JSON.stringify(notification('GBN-1', 'DRAFT'))
        : JSON.stringify(notification('GBN-2', 'SUBMITTED'))
    )

    const listed = await records.list({ journeyIds: ['GBN-1', 'GBN-2'] })

    expect(fetchMocker.requests().map((request) => request.url)).toEqual([
      `${notificationsUrl}/GBN-1`,
      `${notificationsUrl}/GBN-2`
    ])
    expect(
      listed.map(({ journeyId, status }) => ({ journeyId, status }))
    ).toEqual([
      { journeyId: 'GBN-1', status: IN_PROGRESS },
      { journeyId: 'GBN-2', status: SUBMITTED }
    ])
    expect(listed[1].submittedAt).toBe('2026-07-14T10:00:00')
  })

  it('Should skip references the backend no longer knows', async () => {
    fetchMocker.mockResponse((request) =>
      request.url.endsWith('/GBN-GONE')
        ? { status: 404, body: 'Not Found' }
        : JSON.stringify(notification('GBN-1', 'DRAFT'))
    )

    const listed = await records.list({ journeyIds: ['GBN-1', 'GBN-GONE'] })

    expect(listed.map((journey) => journey.journeyId)).toEqual(['GBN-1'])
  })

  it('Should issue no fetch for an empty reference set', async () => {
    expect(await records.list({ journeyIds: [] })).toEqual([])
    expect(fetchMocker.requests()).toHaveLength(0)
  })
})
