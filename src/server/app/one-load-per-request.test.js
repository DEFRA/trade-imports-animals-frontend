import { beforeEach, describe, expect, test, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import { get, commit } from './engine/index.js'
import { configureRecords } from './engine/persistence/records.js'
import { configureReadyForCheckYourAnswers } from './engine/read.js'
import {
  SESSION_COOKIES,
  configureSession
} from './engine/persistence/session.js'
import { records as realRecords } from './services/persistence/records/real/index.js'
import { session as sessionStub } from './services/persistence/session/stub.js'
import { recordingH } from './engine/test-support.js'
import { obligationSet } from './model/obligations/manifest.js'

const { countryOfOrigin } = obligationSet()

// Network-boundary perf contract for the REAL records adapter (S5 hardening —
// "one load per request"). Every currentJourney call — whether from a read
// (state.get) or from a write helper re-deriving the journey — used to hit the
// backend with a fresh GET /notifications/{ref}/fulfilments, and each save re-fetched the same
// record to guard the write. This pins the collapsed behaviour: within one HTTP
// request the real adapter issues at most one canonical GET, followed by a
// single PUT to /notifications/{ref}.

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

const backendBaseUrl = 'http://localhost:8085'
const ref = 'GBN-AG-01-ABC123'
const notificationsUrl = `${backendBaseUrl}/notifications`
const fulfilmentUrl = `${notificationsUrl}/${ref}/fulfilments`

const fulfilmentBody = JSON.stringify({
  referenceNumber: ref,
  status: 'DRAFT',
  created: '2026-07-23T09:00:00',
  submittedAt: null,
  fulfilments: []
})

const buildRequest = () => ({
  params: { journeyId: ref },
  state: { [SESSION_COOKIES.knownJourneys]: [ref] },
  app: {},
  headers: {}
})

const getsFor = (url) =>
  fetchMocker
    .requests()
    .filter((request) => request.method === 'GET' && request.url === url)

const requestsTo = (method, url) =>
  fetchMocker
    .requests()
    .filter((request) => request.method === method && request.url === url)

describe('one load per request — real records adapter GET count', () => {
  const notificationRefUrl = `${notificationsUrl}/${ref}`

  beforeEach(() => {
    fetchMocker.resetMocks()
    fetchMocker.mockResponse((req) => {
      if (req.method === 'GET' && req.url === fulfilmentUrl) {
        return fulfilmentBody
      }
      if (req.method === 'PUT' && req.url === notificationRefUrl) {
        return req
          .clone()
          .text()
          .then((body) =>
            // The backend answers with the saved Notification, not an echo of the
            // request, so unwrap the SaveNotificationDto envelope.
            JSON.stringify({
              ...JSON.parse(body).notification,
              status: 'DRAFT',
              created: '2026-07-23T09:00:00',
              submittedAt: null
            })
          )
      }
      if (req.method === 'POST' && req.url === notificationsUrl) {
        return req
          .clone()
          .text()
          .then((body) =>
            JSON.stringify({
              referenceNumber: ref,
              status: 'DRAFT',
              ...(body ? JSON.parse(body) : {})
            })
          )
      }
      return { status: 404, body: 'Not Found' }
    })
    configureRecords(realRecords)
    configureSession(sessionStub)
    configureReadyForCheckYourAnswers(() => false)
  })

  test('Should issue exactly one GET for a read-then-write request, plus one PUT to the notifications endpoint', async () => {
    const request = buildRequest()

    const before = await get(request, recordingH())
    await commit(request, recordingH(), { countryOfOrigin: 'FR' })

    expect(before.fulfilment).toEqual({})
    expect(getsFor(fulfilmentUrl)).toHaveLength(1)
    expect(requestsTo('PUT', notificationRefUrl)).toHaveLength(1)
    // No POST /notifications is expected — the PUT above carries everything.
    expect(requestsTo('POST', notificationsUrl)).toHaveLength(0)
  })

  test('Should serve a post-write read from the request without a stale value or extra GET', async () => {
    const request = buildRequest()

    await get(request, recordingH())
    await commit(request, recordingH(), { countryOfOrigin: 'FR' })
    const after = await get(request, recordingH())

    expect(after.answers.countryOfOrigin).toBe('FR')
    expect(after.fulfilment).toEqual({ [countryOfOrigin.id]: 'FR' })
    expect(getsFor(fulfilmentUrl)).toHaveLength(1)
  })

  test('Should not leak the load across requests — a fresh request re-fetches', async () => {
    await get(buildRequest(), recordingH())
    await get(buildRequest(), recordingH())

    expect(getsFor(fulfilmentUrl)).toHaveLength(2)
  })
})
