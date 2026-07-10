import { beforeEach, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import { records } from './real.js'

// S5 hardening — user-scoping leak. The real adapter used to answer
// load({ userId }) with a global-newest read (GET /notifications?sort=updated,desc)
// and hand back list[0] — whoever's notification was updated last, across all
// users. The real production FE has no resume-by-user path (it resumes only by
// referenceNumber), so the faithful mirror is: real-mode load({ userId }) does
// no list read at all and returns undefined; resumeByUser then starts a fresh
// draft. This pins that at the HTTP boundary, not via a module spy.

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

const notificationsUrl = 'http://localhost:8085/notifications'

const getsToList = () =>
  fetchMocker
    .requests()
    .filter((r) => r.method === 'GET' && r.url.startsWith(notificationsUrl))

describe('real records adapter — no resume-by-user list read', () => {
  beforeEach(() => {
    fetchMocker.resetMocks()
    fetchMocker.mockResponse(() => ({ status: 404, body: 'Not Found' }))
  })

  it('Should return undefined for load({ userId }) with no journeyId', async () => {
    const result = await records.load({ userId: 'user-A' })

    expect(result).toBeUndefined()
  })

  it('Should issue no fetch at all for load({ userId }) — the global-newest read is gone', async () => {
    await records.load({ userId: 'user-A' })

    expect(getsToList()).toHaveLength(0)
    expect(fetchMocker.requests()).toHaveLength(0)
  })
})
