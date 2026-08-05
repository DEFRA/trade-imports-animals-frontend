export const SESSION_COOKIES = {
  knownJourneys: 'knownJourneys',
  openingRun: 'openingRun',
  flowOnlyAnswers: 'flowOnlyAnswers'
}

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
    Object.assign(SESSION_COOKIES, cookieNames)
  }
}

export const session = {
  knownJourneyIds: async (...args) => impl.knownJourneyIds(...args),
  addKnownJourney: async (...args) => impl.addKnownJourney(...args),
  openingRun: async (...args) => impl.openingRun(...args),
  setOpeningRun: async (...args) => impl.setOpeningRun(...args),
  flowOnlyAnswers: async (...args) => impl.flowOnlyAnswers(...args),
  setFlowOnlyAnswers: async (...args) => impl.setFlowOnlyAnswers(...args)
}
