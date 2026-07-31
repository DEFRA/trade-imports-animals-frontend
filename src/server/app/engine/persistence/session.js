export let KNOWN_JOURNEYS_COOKIE = 'knownJourneys'
export let OPENING_RUN_COOKIE = 'openingRun'
export let FLOW_ONLY_ANSWERS_COOKIE = 'flowOnlyAnswers'

const unconfigured = () => {
  throw new Error('session not configured — call configureSession() at boot')
}

let impl = {
  knownJourneyIds: unconfigured,
  addKnownJourney: unconfigured,
  openingRun: unconfigured,
  setOpeningRun: unconfigured,
  flowOnlyAnswers: unconfigured,
  setFlowOnlyAnswers: unconfigured
}

export const configureSession = (newImpl, cookieNames) => {
  impl = newImpl
  if (cookieNames) {
    KNOWN_JOURNEYS_COOKIE = cookieNames.knownJourneys
    OPENING_RUN_COOKIE = cookieNames.openingRun
    FLOW_ONLY_ANSWERS_COOKIE = cookieNames.flowOnlyAnswers
  }
}

export const session = {
  knownJourneyIds: (...args) => impl.knownJourneyIds(...args),
  addKnownJourney: (...args) => impl.addKnownJourney(...args),
  openingRun: (...args) => impl.openingRun(...args),
  setOpeningRun: (...args) => impl.setOpeningRun(...args),
  flowOnlyAnswers: (...args) => impl.flowOnlyAnswers(...args),
  setFlowOnlyAnswers: (...args) => impl.setFlowOnlyAnswers(...args)
}
