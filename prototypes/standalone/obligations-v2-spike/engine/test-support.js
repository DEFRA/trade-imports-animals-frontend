import { store } from './store.js'
import { JOURNEY_COOKIE } from './journey.js'

/**
 * Shared fakes for the engine specs (and the T1/T2 controller regressions). One
 * source of truth for the Hapi response-toolkit stub, the request builders, the
 * cookie-recording toolkit and the in-scope seed — retiring the copies that had
 * drifted (a capturing vs non-capturing `stubH`, a request with vs without
 * `headers`, two recording `h` shapes, a per-port `seed`).
 */

/**
 * The Hapi response toolkit (`h`) stub. `view` records the last render into
 * `captured.view` AND returns it, so a controller test can either ignore the
 * render (the engine specs) or assert on the rendered context (the hub-copy and
 * currency regressions read `captured.view.ctx`). `redirect` echoes its target;
 * `state` is a no-op cookie write.
 */
export const stubH = () => {
  const captured = {}
  return {
    view: (view, ctx) => {
      captured.view = { view, ctx }
      return captured.view
    },
    redirect: (to) => ({ redirect: to }),
    state: () => {},
    captured
  }
}

/**
 * A request pinned to an existing journey via its cookie. `headers` is always
 * present (empty) — the session port optional-chains it, so this is byte-equal
 * to a request without headers, but keeps every caller uniform. `overrides` lets
 * a case supply a `payload`/`params` (e.g. a nested driver claim add).
 */
export const journeyRequest = (journeyId, overrides = {}) => ({
  payload: {},
  params: {},
  query: {},
  state: { [JOURNEY_COOKIE]: journeyId },
  headers: {},
  ...overrides
})

/**
 * A recording `h` for the session seam. Exposes both views a spec might assert
 * on: `calls` is the ordered log of `state(name, value)` writes, `cookies` is the
 * resulting cookie jar (`unstate` deletes from it). A spec that only needs `h` to
 * be callable ignores both.
 */
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
 * Seed answers through a persistence port, keeping the named-driver add-on
 * selected so the `drivers` collection stays IN SCOPE — otherwise a reconcile
 * would (correctly) wipe the whole out-of-scope collection and mask the path-op
 * behaviour under test. `port` is `store` or the durable `records` port.
 */
export const seedNamedDriver = (port, journeyId, answers) =>
  port.saveAnswers(journeyId, { addons: ['named-driver'], ...answers })

/**
 * Drive one real controller handler against the real store: mint a journey, save
 * `seed`, invoke the handler, and hand back before/after answers plus the raw
 * response and the captured view (a redirect on success, a re-rendered view on
 * the error path).
 */
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

/** The single POST handler a feature module declares. */
export const postHandlerOf = (mod) =>
  mod.routes.find((route) => route.method === 'POST').handler

/**
 * The POST handler whose path ends with `pathSuffix` — for feature modules that
 * expose more than one POST route (an add/remove sub-hub).
 */
export const postHandlerEndingWith = (mod, pathSuffix) =>
  mod.routes.find(
    (route) => route.method === 'POST' && route.path.endsWith(pathSuffix)
  ).handler
