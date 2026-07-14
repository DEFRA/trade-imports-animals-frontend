import {
  STUB_USER,
  STUB_USER_HEADER,
  JOURNEY_COOKIE,
  KNOWN_JOURNEYS_COOKIE,
  OPENING_RUN_COOKIE
} from '../../../engine/persistence/session.js'

const knownFrom = (request) => {
  const known = request?.state?.[KNOWN_JOURNEYS_COOKIE]
  return Array.isArray(known) ? known : []
}

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

  async knownJourneyIds(request) {
    return knownFrom(request)
  },

  async addKnownJourney(request, h, journeyId) {
    const known = knownFrom(request)
    if (known.includes(journeyId)) return
    h.state(KNOWN_JOURNEYS_COOKIE, [...known, journeyId])
  },

  async clearActive(h) {
    h.unstate(JOURNEY_COOKIE)
  },

  async openingRun(request) {
    return request?.state?.[OPENING_RUN_COOKIE]
  },

  async setOpeningRun(h, record) {
    h.state(OPENING_RUN_COOKIE, record)
  }
}
