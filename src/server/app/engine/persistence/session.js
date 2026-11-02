import { currentSetId, setKeyed } from '../../shared/set-context.js'

const DEFAULT_COOKIE_NAMES = Object.freeze({
  knownJourneys: 'knownJourneys',
  openingRun: 'openingRun',
  flowOnlyAnswers: 'flowOnlyAnswers',
  addressHandshakeTokens: 'addressHandshakeTokens',
  addedAddressBanner: 'addedAddressBanner',
  reviewedConcurrencyTokens: 'reviewedConcurrencyTokens'
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
    setFlowOnlyAnswers: unconfigured,
    reviewedConcurrencyToken: unconfigured,
    setReviewedConcurrencyToken: unconfigured
  }),
  cookieNames: DEFAULT_COOKIE_NAMES
})

const store = setKeyed('session', { configuredBy: 'configureSession' })

const current = () =>
  store.has(currentSetId()) ? store.current() : UNCONFIGURED

/** Whether `configureSession` has run for this set. */
export const sessionConfiguredFor = (setId) => store.has(setId)

export const configureSession = (setId, impl, cookieNames) => {
  store.configure(setId, {
    impl,
    cookieNames: { ...DEFAULT_COOKIE_NAMES, ...cookieNames }
  })
}

export const knownJourneysCookie = () => current().cookieNames.knownJourneys
export const openingRunCookie = () => current().cookieNames.openingRun
export const flowOnlyAnswersCookie = () => current().cookieNames.flowOnlyAnswers
export const addressHandshakeTokensCookie = () =>
  current().cookieNames.addressHandshakeTokens
export const addedAddressBannerCookie = () =>
  current().cookieNames.addedAddressBanner
export const reviewedConcurrencyTokensCookie = () =>
  current().cookieNames.reviewedConcurrencyTokens

/**
 * The names of the active set's journey cookies.
 *
 * @returns {string[]} every journey cookie name the set is configured with.
 */
export const journeyCookieNames = () => Object.values(current().cookieNames)

export const session = {
  knownJourneyIds: async (...args) => current().impl.knownJourneyIds(...args),
  addKnownJourney: async (...args) => current().impl.addKnownJourney(...args),
  openingRun: async (...args) => current().impl.openingRun(...args),
  setOpeningRun: async (...args) => current().impl.setOpeningRun(...args),
  flowOnlyAnswers: async (...args) => current().impl.flowOnlyAnswers(...args),
  setFlowOnlyAnswers: async (...args) =>
    current().impl.setFlowOnlyAnswers(...args),
  reviewedConcurrencyToken: async (...args) =>
    current().impl.reviewedConcurrencyToken(...args),
  setReviewedConcurrencyToken: async (...args) =>
    current().impl.setReviewedConcurrencyToken(...args)
}
