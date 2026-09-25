import { currentSetId, setKeyed } from '../../shared/set-context.js'

const DEFAULT_COOKIE_NAMES = Object.freeze({
  knownJourneys: 'knownJourneys',
  openingRun: 'openingRun',
  flowOnlyAnswers: 'flowOnlyAnswers',
  addressHandshakeTokens: 'addressHandshakeTokens'
})

const unconfigured = () => {
  throw new Error('session not configured — call configureSession() at boot')
}

const UNCONFIGURED = Object.freeze({
  impl: Object.freeze({
    knownJourneyIds: unconfigured,
    addKnownJourney: unconfigured,
    openingRun: unconfigured,
    setOpeningRun: unconfigured,
    flowOnlyAnswers: unconfigured,
    setFlowOnlyAnswers: unconfigured
  }),
  cookieNames: DEFAULT_COOKIE_NAMES
})

const store = setKeyed('session', { configuredBy: 'configureSession' })

// Reading before configuration is the un-booted case, which must report itself
// through `unconfigured` rather than through setKeyed's "no such set" error.
// Cookie names still answer, because a set may register its cookies before it
// configures its store.
const current = () =>
  store.has(currentSetId()) ? store.current() : UNCONFIGURED

/** Whether this set has been through `configureSession`. Callers that must run
 * after it — `registerJourneyCookie` reads the configured cookie names — ask
 * rather than silently taking the default names. */
export const sessionConfiguredFor = (setId) => store.has(setId)

export const configureSession = (setId, impl, cookieNames) => {
  store.configure(setId, {
    impl,
    cookieNames: { ...DEFAULT_COOKIE_NAMES, ...cookieNames }
  })
}

// Per-set accessors rather than one module constant: two sets in one process
// need two sets of cookie names, and a shared object would let the second
// registration rename the first set's cookies out from under it.
export const knownJourneysCookie = () => current().cookieNames.knownJourneys
export const openingRunCookie = () => current().cookieNames.openingRun
export const flowOnlyAnswersCookie = () => current().cookieNames.flowOnlyAnswers
export const addressHandshakeTokensCookie = () =>
  current().cookieNames.addressHandshakeTokens

export const session = {
  knownJourneyIds: async (...args) => current().impl.knownJourneyIds(...args),
  addKnownJourney: async (...args) => current().impl.addKnownJourney(...args),
  openingRun: async (...args) => current().impl.openingRun(...args),
  setOpeningRun: async (...args) => current().impl.setOpeningRun(...args),
  flowOnlyAnswers: async (...args) => current().impl.flowOnlyAnswers(...args),
  setFlowOnlyAnswers: async (...args) =>
    current().impl.setFlowOnlyAnswers(...args)
}
