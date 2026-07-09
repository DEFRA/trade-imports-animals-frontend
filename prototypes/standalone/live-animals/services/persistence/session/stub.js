import {
  STUB_USER,
  STUB_USER_HEADER,
  JOURNEY_COOKIE
} from '../../../engine/persistence/session.js'

export const session = {
  userId(request) {
    return request?.headers?.[STUB_USER_HEADER] ?? STUB_USER
  },

  activeJourneyId(request) {
    return request?.state?.[JOURNEY_COOKIE]
  },

  setActiveJourney(h, journeyId) {
    h.state(JOURNEY_COOKIE, journeyId)
  },

  clearActive(h) {
    h.unstate(JOURNEY_COOKIE)
  }
}
