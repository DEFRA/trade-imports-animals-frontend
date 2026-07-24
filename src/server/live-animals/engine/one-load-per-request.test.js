import { beforeEach, describe, expect, test, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import { get, commit } from './index.js'
import { configureRecords } from './persistence/records.js'
import { configureReadyForCheckYourAnswers } from './read.js'
import {
  KNOWN_JOURNEYS_COOKIE,
  configureSession
} from './persistence/session.js'
import { records as realRecords } from '../services/persistence/records/real.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { recordingH } from './test-support.js'
import { countryOfOrigin } from '../model/obligations/obligations.js'

// Network-boundary perf contract for the REAL records adapter (S5 hardening —
// "one load per request"). Every currentJourney call — whether from a read
// (state.get) or from a write helper re-deriving the journey — used to hit the
// backend with a fresh GET /fulfilments/{ref}, and each save re-fetched the same
// record to guard the write. This pins the collapsed behaviour: within one HTTP
// request the real adapter issues at most one canonical GET, followed by the
// canonical and two projection PUTs.

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

const backendBaseUrl = 'http://localhost:8085'
const ref = 'GBN-AG-01-ABC123'
const fulfilmentUrl = `${backendBaseUrl}/fulfilments/${ref}`
const notificationsUrl = `${backendBaseUrl}/notifications`
const proposedNotificationsUrl = `${backendBaseUrl}/proposed-notifications`

const fulfilmentBody = JSON.stringify({
  id: ref,
  status: 'IN_PROGRESS',
  createdAt: '2026-07-23T09:00:00',
  submittedAt: null,
  fulfilment: []
})

const buildRequest = () => ({
  params: { journeyId: ref },
  state: { [KNOWN_JOURNEYS_COOKIE]: [ref] },
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
  beforeEach(() => {
    fetchMocker.resetMocks()
    fetchMocker.mockResponse((req) => {
      if (req.method === 'GET' && req.url === fulfilmentUrl) {
        return fulfilmentBody
      }
      if (req.method === 'PUT' && req.url === fulfilmentUrl) {
        return req
          .clone()
          .text()
          .then((body) =>
            JSON.stringify({
              ...JSON.parse(body),
              status: 'IN_PROGRESS',
              createdAt: '2026-07-23T09:00:00',
              submittedAt: null
            })
          )
      }
      if (
        req.method === 'PUT' &&
        (req.url === `${notificationsUrl}/${ref}` ||
          req.url === `${proposedNotificationsUrl}/${ref}`)
      ) {
        return ''
      }
      return { status: 404, body: 'Not Found' }
    })
    configureRecords(realRecords)
    configureSession(sessionStub)
    configureReadyForCheckYourAnswers(() => false)
  })

  test('Should issue exactly one GET for a read-then-write request, plus the three PUTs', async () => {
    const request = buildRequest()

    const before = await get(request, recordingH())
    await commit(request, recordingH(), { countryOfOrigin: 'FR' })

    expect(before.fulfilment).toEqual({})
    expect(getsFor(fulfilmentUrl)).toHaveLength(1)
    expect(requestsTo('PUT', fulfilmentUrl)).toHaveLength(1)
    expect(requestsTo('PUT', `${notificationsUrl}/${ref}`)).toHaveLength(1)
    expect(
      requestsTo('PUT', `${proposedNotificationsUrl}/${ref}`)
    ).toHaveLength(1)
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
