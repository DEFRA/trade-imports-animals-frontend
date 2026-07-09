import { STUB_USER } from '../../../engine/persistence/session.js'

const ACTIVE_JOURNEY = 'liveAnimalsActiveJourney'

export const session = {
  async userId(request) {
    return request?.auth?.credentials?.sub ?? STUB_USER
  },

  async activeJourneyId(request) {
    return request?.yar?.get(ACTIVE_JOURNEY) ?? undefined
  },

  async setActiveJourney(h, journeyId) {
    h.request.yar.set(ACTIVE_JOURNEY, journeyId)
  },

  async clearActive(h) {
    h.request.yar.clear(ACTIVE_JOURNEY)
  }
}
