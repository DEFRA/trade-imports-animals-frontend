import Crumb from '@hapi/crumb'
import Hapi from '@hapi/hapi'
import { afterAll, beforeAll, beforeEach, vi } from 'vitest'
import { config } from '../../../config/config.js'
import { buildDispatch } from '../flow/dispatch.js'
import { currentSetId } from '../shared/set-context.js'
import { records as recordsStub } from '../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { store } from './store.js'
import { knownJourneysCookie } from './journey.js'
import { configureRecords, records } from './persistence/records.js'
import { configureSession } from './persistence/session.js'

export const authenticatedCredentials = Object.freeze({
  contactId: 2100010101,
  name: 'Andrew Farmer',
  currentRelationshipId: '5900001',
  organisationId: '5900001'
})

export const authenticatedActor = Object.freeze({
  id: '2100010101',
  source: 'dynamics-contact',
  userType: 'B2C',
  displayName: 'Andrew Farmer',
  organisationId: '5900001'
})

const stubResponse = (payload) => ({
  payload,
  code: (statusCode) => ({ payload, statusCode })
})

const stubView = (captured) => (view, context) => {
  const rendered = {
    view,
    context,
    statusCode: 200,
    code(statusCode) {
      this.statusCode = statusCode
      return this
    }
  }
  captured.view = rendered
  return rendered
}

export const registerTestRequestLogger = (server) => {
  server.decorate('request', 'logger', () => recordingLogger(), { apply: true })
}

export const registerTestSessionAuth = (server) => {
  server.auth.scheme('test-session', () => ({
    authenticate: (_request, h) =>
      h.authenticated({ credentials: authenticatedCredentials })
  }))
  server.auth.strategy('session', 'test-session')
}

export const crumbProtectedServerMounting = async (routes, prefix) => {
  const server = Hapi.server()
  await server.register(Crumb)
  registerTestSessionAuth(server)
  await server.register(
    {
      name: 'routes-under-test',
      register: (inner) => inner.route(routes)
    },
    { routes: { prefix } }
  )
  return server
}

const cookieRecorder = () => {
  const cookies = {}
  const calls = []
  return {
    cookies,
    calls,
    state: (name, value) => {
      calls.push([name, value])
      cookies[name] = value
    },
    unstate: (name) => {
      delete cookies[name]
    }
  }
}

/** A response toolkit that records what the handler rendered. Pass the request
 * to expose it as `h.request`. */
export const stubH = (request) => {
  const captured = {}
  return {
    ...cookieRecorder(),
    request,
    view: stubView(captured),
    redirect: (to) => {
      const result = { redirect: to }
      Object.defineProperty(result, 'code', {
        value: (statusCode) => {
          result.statusCode = statusCode
          return result
        }
      })
      return result
    },
    response: stubResponse,
    captured
  }
}

/** A request logger that keeps every line it is given in `entries`. */
export const recordingLogger = () => {
  const entries = []
  const recordAt = (level) => (fields, message) =>
    entries.push({ level, fields, message })
  return {
    entries,
    debug: recordAt('debug'),
    info: recordAt('info'),
    warn: recordAt('warn'),
    error: recordAt('error')
  }
}

export const journeyRequest = (
  journeyId,
  { knownJourneyIds, ...overrides } = {}
) => ({
  app: {},
  payload: {},
  query: {},
  headers: {},
  logger: recordingLogger(),
  auth: {
    isAuthenticated: true,
    credentials: authenticatedCredentials
  },
  ...overrides,
  params: { journeyId, ...overrides.params },
  state: {
    [knownJourneysCookie()]: knownJourneyIds ?? (journeyId ? [journeyId] : []),
    ...overrides.state
  }
})

/** The text a copy leaf gives: the string itself, or what the copy function
 * returns for the sample arguments. */
export const sampleText = (value, sampleArguments) =>
  typeof value === 'function' ? value(...sampleArguments) : value

export const recordingH = () => cookieRecorder()

export const backendJourneyId = 'GBN-AG-26-ABC123'

export const backendNotification = ({
  status = 'DRAFT',
  fulfilments = [],
  concurrencyToken = 0,
  submittedAt = null
} = {}) =>
  JSON.stringify({
    referenceNumber: backendJourneyId,
    fulfilments,
    status,
    created: '2026-07-23T09:00:00Z',
    submittedAt,
    concurrencyToken
  })

const requestLocation = (pathOf, journeyId, query) => {
  if (!pathOf) {
    return {}
  }
  const path = pathOf(journeyId)
  const url = new URL(path, 'http://localhost')
  Object.entries(query).forEach(([name, value]) =>
    url.searchParams.set(name, value)
  )
  return { path, url }
}

const recordsRejectingSaves = (failure) => ({
  ...recordsStub,
  replaceFulfilment: async () => {
    throw failure
  }
})

/** Seeds a journey, runs one handler against it and reports the answers before
 * and after. `amend` submits the journey and opens an amendment first;
 * `pathOf(journeyId)` gives the request the path it was made to;
 * `saveFailure` makes the records store refuse every save the handler makes
 * with that error. */
export const driveHandler = async (
  handler,
  {
    payload = {},
    seed = {},
    params = {},
    query = {},
    state = {},
    amend = false,
    saveFailure,
    pathOf
  } = {}
) => {
  const journey = await store.create()
  await store.seedAnswers(journey.journeyId, seed)
  if (amend) {
    await store.submit(journey.journeyId)
    await records.amend(journey.journeyId)
  }
  const request = journeyRequest(journey.journeyId, {
    payload,
    params,
    query,
    state,
    ...requestLocation(pathOf, journey.journeyId, query)
  })
  const h = stubH(request)
  if (saveFailure) {
    configureRecords(currentSetId(), recordsRejectingSaves(saveFailure))
  }
  let response
  try {
    response = await handler(request, h)
  } finally {
    configureRecords(currentSetId(), recordsStub)
  }
  const after = (await store.get(journey.journeyId)).answers
  return {
    journeyId: journey.journeyId,
    before: seed,
    after,
    response,
    view: h.captured.view,
    logger: request.logger
  }
}

export const postHandlerOf = (featureModule) =>
  featureModule.routes.find((route) => route.method === 'POST').handler

export const postHandlerEndingWith = (featureModule, pathSuffix) =>
  featureModule.routes.find(
    (route) => route.method === 'POST' && route.path.endsWith(pathSuffix)
  ).handler

export const referenceDataServing = () => {
  const originalMode = config.get('stubMode')
  afterAll(() => {
    vi.unstubAllGlobals()
    config.set('stubMode', originalMode)
  })
  return (rows) => {
    config.set('stubMode', false)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => rows }))
    )
  }
}

export const useStubbedJourney = (setId, dispatchPages) => {
  beforeAll(() => {
    configureRecords(setId, recordsStub)
    configureSession(setId, sessionStub)
    buildDispatch(setId, dispatchPages)
  })
  beforeEach(() => store.clear())
}
