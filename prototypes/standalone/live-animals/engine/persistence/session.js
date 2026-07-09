export const STUB_USER = 'stub-user-0001'
export const STUB_USER_HEADER = 'x-stub-user'
export const JOURNEY_COOKIE = 'liveAnimalsJourneyId'

const unconfigured = () => {
  throw new Error('session not configured — call configureSession() at boot')
}

let impl = {
  userId: unconfigured,
  activeJourneyId: unconfigured,
  setActiveJourney: unconfigured,
  clearActive: unconfigured
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
  clearActive(...args) {
    return impl.clearActive(...args)
  }
}
