import { store } from './store.js'
import { JOURNEY_COOKIE } from './journey.js'

/** Shared fakes for the engine and controller specs. */

/** Hapi response-toolkit stub — `view` records the last render into `captured.view`. */
export const stubH = () => {
  const captured = {}
  return {
    view: (view, context) => {
      captured.view = { view, context }
      return captured.view
    },
    redirect: (to) => ({ redirect: to }),
    state: () => {},
    captured
  }
}

/** A request pinned to an existing journey via its cookie. */
export const journeyRequest = (journeyId, overrides = {}) => ({
  payload: {},
  params: {},
  query: {},
  state: { [JOURNEY_COOKIE]: journeyId },
  headers: {},
  ...overrides
})

/** A recording `h` for the session seam — logs `state` writes and keeps a cookie jar. */
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

/**
 * Seed answers keeping the named-driver add-on selected so the `drivers`
 * collection stays IN SCOPE — otherwise a reconcile would (correctly) wipe the
 * whole out-of-scope collection and mask the path-op behaviour under test.
 */
export const seedNamedDriver = (port, journeyId, answers) =>
  port.saveAnswers(journeyId, { addons: ['named-driver'], ...answers })

/** Drive one real controller handler against the real store. */
export const driveHandler = (
  handler,
  { payload = {}, seed = {}, params = {} } = {}
) => {
  const journey = store.create()
  store.saveAnswers(journey.journeyId, seed)
  const h = stubH()
  const response = handler(
    journeyRequest(journey.journeyId, { payload, params }),
    h
  )
  return {
    before: seed,
    after: store.get(journey.journeyId).answers,
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
