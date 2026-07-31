export const KNOWN_JOURNEYS_COOKIE = 'liveAnimalsKnownJourneys'
export const OPENING_RUN_COOKIE = 'liveAnimalsOpeningRun'
export const FLOW_ONLY_ANSWERS_COOKIE = 'liveAnimalsFlowOnlyAnswers'

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

export const configureSession = (newImpl) => {
  impl = newImpl
}

export const session = {
  knownJourneyIds: (...args) => impl.knownJourneyIds(...args),
  addKnownJourney: (...args) => impl.addKnownJourney(...args),
  openingRun: (...args) => impl.openingRun(...args),
  setOpeningRun: (...args) => impl.setOpeningRun(...args),
  flowOnlyAnswers: (...args) => impl.flowOnlyAnswers(...args),
  setFlowOnlyAnswers: (...args) => impl.setFlowOnlyAnswers(...args)
}
