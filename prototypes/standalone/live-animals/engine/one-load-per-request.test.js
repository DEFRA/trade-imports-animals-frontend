import { beforeEach, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import { get, commit } from './index.js'
import { configureRecords } from './persistence/records.js'
import { configureReadyForCheckYourAnswers } from './read.js'
import { JOURNEY_COOKIE, configureSession } from './persistence/session.js'
import { records as realRecords } from '../services/persistence/records/real.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { recordingH } from './test-support.js'

// Network-boundary perf contract for the REAL records adapter (S5 hardening —
// "one load per request"). Every currentJourney call — whether from a read
// (state.get) or from a write helper re-deriving the journey — used to hit the
// backend with a fresh GET /notifications/{ref}, and each save re-fetched the
// same record to guard the write. This pins the collapsed behaviour: within a
// single HTTP request touching one journey the real adapter issues at most ONE
// GET for that journey, plus the write POST — asserted against the mocked HTTP
// boundary, not a module spy.

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

const backendBaseUrl = 'http://localhost:8085'
const ref = 'GBN-AG-01-ABC123'
const notificationUrl = `${backendBaseUrl}/notifications/${ref}`
const notificationsUrl = `${backendBaseUrl}/notifications`

const notificationBody = JSON.stringify({
  referenceNumber: ref,
  status: 'DRAFT'
})

const buildRequest = () => ({
  state: { [JOURNEY_COOKIE]: ref },
  app: {},
  headers: {}
})

const getsFor = (url) =>
  fetchMocker.requests().filter((r) => r.method === 'GET' && r.url === url)

const postsTo = (url) =>
  fetchMocker.requests().filter((r) => r.method === 'POST' && r.url === url)

describe('one load per request — real records adapter GET count', () => {
  beforeEach(() => {
    fetchMocker.resetMocks()
    fetchMocker.mockResponse((req) => {
      if (req.method === 'GET' && req.url === notificationUrl) {
        return notificationBody
      }
      if (req.method === 'POST' && req.url === notificationsUrl) {
        return notificationBody
      }
      return { status: 404, body: 'Not Found' }
    })
    configureRecords(realRecords)
    configureSession(sessionStub)
    configureReadyForCheckYourAnswers(() => false)
  })

  it('Should issue exactly one GET for a read-then-write request, plus the write POST', async () => {
    const request = buildRequest()

    await get(request, recordingH())
    await commit(request, recordingH(), { countryOfOrigin: 'FR' })

    expect(getsFor(notificationUrl)).toHaveLength(1)
    expect(postsTo(notificationsUrl)).toHaveLength(1)
  })

  it('Should serve a post-write read from the request without a stale value or extra GET', async () => {
    const request = buildRequest()

    await get(request, recordingH())
    await commit(request, recordingH(), { countryOfOrigin: 'FR' })
    const after = await get(request, recordingH())

    expect(after.answers.countryOfOrigin).toBe('FR')
    expect(getsFor(notificationUrl)).toHaveLength(1)
  })

  it('Should not leak the load across requests — a fresh request re-fetches', async () => {
    await get(buildRequest(), recordingH())
    await get(buildRequest(), recordingH())

    expect(getsFor(notificationUrl)).toHaveLength(2)
  })
})
