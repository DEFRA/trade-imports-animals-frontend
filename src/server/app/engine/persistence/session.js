import { currentSetId, setKeyed } from '../../shared/set-context.js'

const DEFAULT_COOKIE_NAMES = Object.freeze({
  knownJourneys: 'knownJourneys',
  openingRun: 'openingRun',
  flowOnlyAnswers: 'flowOnlyAnswers'
})

const unconfigured = () => {
  throw new Error('session not configured — call configureSession() at boot')
}

const unconfiguredImpl = Object.freeze({
  knownJourneyIds: unconfigured,
  addKnownJourney: unconfigured,
  openingRun: unconfigured,
  setOpeningRun: unconfigured,
  flowOnlyAnswers: unconfigured,
  setFlowOnlyAnswers: unconfigured
})

const store = setKeyed('session')

const current = () => {
  const setId = currentSetId()
  if (!store.has(setId)) {
    store.configure(setId, {
      impl: unconfiguredImpl,
      cookieNames: DEFAULT_COOKIE_NAMES
    })
  }
  return store.current()
}

export const configureSession = (setId, impl, cookieNames) => {
  store.configure(setId, {
    impl,
    cookieNames: { ...DEFAULT_COOKIE_NAMES, ...cookieNames }
  })
}

export const knownJourneysCookie = () => current().cookieNames.knownJourneys
export const openingRunCookie = () => current().cookieNames.openingRun
export const flowOnlyAnswersCookie = () => current().cookieNames.flowOnlyAnswers

export const session = {
  knownJourneyIds: (...args) => current().impl.knownJourneyIds(...args),
  addKnownJourney: (...args) => current().impl.addKnownJourney(...args),
  openingRun: (...args) => current().impl.openingRun(...args),
  setOpeningRun: (...args) => current().impl.setOpeningRun(...args),
  flowOnlyAnswers: (...args) => current().impl.flowOnlyAnswers(...args),
  setFlowOnlyAnswers: (...args) => current().impl.setFlowOnlyAnswers(...args)
}
