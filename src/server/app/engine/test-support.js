import { store } from './store.js'
import { knownJourneysCookie } from './journey.js'

// Mirrors what plugins/auth.js puts on credentials after sign-in: the raw
// `currentRelationshipId` claim, plus the `organisationId` it is mapped to.
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

/** A 'session' strategy that authenticates every request, for tests that
 * register kit.routeOptions routes on a bare Hapi.server(). */
export const registerTestSessionAuth = (server) => {
  server.auth.scheme('test-session', () => ({
    authenticate: (_request, h) =>
      h.authenticated({ credentials: authenticatedCredentials })
  }))
  server.auth.strategy('session', 'test-session')
}

export const stubH = () => {
  const captured = {}
  const cookies = {}
  return {
    view: stubView(captured),
    redirect: (to) => {
      const result = { redirect: to }
      // Non-enumerable so tests that assert toEqual({ redirect: to }) still
      // match after chaining .code(...).
      Object.defineProperty(result, 'code', {
        value: (statusCode) => {
          result.statusCode = statusCode
          return result
        }
      })
      return result
    },
    response: stubResponse,
    state: (name, value) => {
      cookies[name] = value
    },
    unstate: (name) => {
      delete cookies[name]
    },
    cookies,
    captured
  }
}

export const journeyRequest = (journeyId, overrides = {}) => ({
  payload: {},
  query: {},
  headers: {},
  auth: {
    isAuthenticated: true,
    credentials: authenticatedCredentials
  },
  ...overrides,
  params: { journeyId, ...overrides.params },
  state: {
    [knownJourneysCookie()]: [journeyId],
    ...overrides.state
  }
})

export const recordingH = () => {
  const cookies = {}
  const calls = []
  return {
    state: (name, value) => {
      calls.push([name, value])
      cookies[name] = value
    },
    unstate: (name) => {
      delete cookies[name]
    },
    cookies,
    calls
  }
}

export const driveHandler = async (
  handler,
  { payload = {}, seed = {}, params = {}, query = {}, state = {} } = {}
) => {
  const journey = await store.create()
  await store.seedAnswers(journey.journeyId, seed)
  const h = stubH()
  const response = await handler(
    journeyRequest(journey.journeyId, { payload, params, query, state }),
    h
  )
  const after = (await store.get(journey.journeyId)).answers
  return {
    journeyId: journey.journeyId,
    before: seed,
    after,
    response,
    view: h.captured.view
  }
}

export const postHandlerOf = (featureModule) =>
  featureModule.routes.find((route) => route.method === 'POST').handler

export const postHandlerEndingWith = (featureModule, pathSuffix) =>
  featureModule.routes.find(
    (route) => route.method === 'POST' && route.path.endsWith(pathSuffix)
  ).handler
