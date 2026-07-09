import { store } from './store.js'
import { JOURNEY_COOKIE } from './journey.js'

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

export const journeyRequest = (journeyId, overrides = {}) => ({
  payload: {},
  params: {},
  query: {},
  state: { [JOURNEY_COOKIE]: journeyId },
  headers: {},
  ...overrides
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
  { payload = {}, seed = {}, params = {} } = {}
) => {
  const journey = store.create()
  store.saveAnswers(journey.journeyId, seed)
  const h = stubH()
  const response = await handler(
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
