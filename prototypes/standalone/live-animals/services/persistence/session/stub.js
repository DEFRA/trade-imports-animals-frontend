import {
  STUB_USER,
  STUB_USER_HEADER,
  JOURNEY_COOKIE
} from '../../../engine/persistence/session.js'

export const session = {
  async userId(request) {
    return request?.headers?.[STUB_USER_HEADER] ?? STUB_USER
  },

  async activeJourneyId(request) {
    return request?.state?.[JOURNEY_COOKIE]
  },

  async setActiveJourney(h, journeyId) {
    h.state(JOURNEY_COOKIE, journeyId)
  },

  async clearActive(h) {
    h.unstate(JOURNEY_COOKIE)
  }
}
