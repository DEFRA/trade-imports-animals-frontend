export const STUB_USER = 'stub-user-0001'
export const STUB_USER_HEADER = 'x-stub-user'
export const JOURNEY_COOKIE = 'liveAnimalsJourneyId'
export const KNOWN_JOURNEYS_COOKIE = 'liveAnimalsKnownJourneys'
export const OPENING_RUN_COOKIE = 'liveAnimalsOpeningRun'

const unconfigured = () => {
  throw new Error('session not configured — call configureSession() at boot')
}

let impl = {
  userId: unconfigured,
  activeJourneyId: unconfigured,
  setActiveJourney: unconfigured,
  knownJourneyIds: unconfigured,
  addKnownJourney: unconfigured,
  clearActive: unconfigured,
  openingRun: unconfigured,
  setOpeningRun: unconfigured
}

export const configureSession = (newImpl) => {
  impl = newImpl
}

export const session = {
  userId(...args) {
    return impl.userId(...args)
  },
  activeJourneyId(...args) {
    return impl.activeJourneyId(...args)
  },
  setActiveJourney(...args) {
    return impl.setActiveJourney(...args)
  },
  knownJourneyIds(...args) {
    return impl.knownJourneyIds(...args)
  },
  addKnownJourney(...args) {
    return impl.addKnownJourney(...args)
  },
  clearActive(...args) {
    return impl.clearActive(...args)
  },
  openingRun(...args) {
    return impl.openingRun(...args)
  },
  setOpeningRun(...args) {
    return impl.setOpeningRun(...args)
  }
}
