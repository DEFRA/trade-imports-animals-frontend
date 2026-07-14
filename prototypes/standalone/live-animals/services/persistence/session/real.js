import { STUB_USER } from '../../../engine/persistence/session.js'

const ACTIVE_JOURNEY = 'liveAnimalsActiveJourney'
const KNOWN_JOURNEYS = 'liveAnimalsKnownJourneys'

const knownFrom = (request) => {
  const known = request?.yar?.get(KNOWN_JOURNEYS)
  return Array.isArray(known) ? known : []
}

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

  async knownJourneyIds(request) {
    return knownFrom(request)
  },

  async addKnownJourney(request, h, journeyId) {
    const known = knownFrom(request)
    if (known.includes(journeyId)) return
    h.request.yar.set(KNOWN_JOURNEYS, [...known, journeyId])
  },

  async clearActive(h) {
    h.request.yar.clear(ACTIVE_JOURNEY)
  }
}
