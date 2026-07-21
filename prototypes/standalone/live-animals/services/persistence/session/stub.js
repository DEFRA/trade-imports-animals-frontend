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

  async setActiveJourney(toolkit, journeyId) {
    toolkit.state(JOURNEY_COOKIE, journeyId)
  },

  async knownJourneyIds(request) {
    return knownFrom(request)
  },

  async addKnownJourney(request, toolkit, journeyId) {
    const known = knownFrom(request)
    if (known.includes(journeyId)) return
    toolkit.state(KNOWN_JOURNEYS_COOKIE, [...known, journeyId])
  },

  async clearActive(toolkit) {
    toolkit.unstate(JOURNEY_COOKIE)
  },

  async openingRun(request) {
    return request?.state?.[OPENING_RUN_COOKIE]
  },

  async setOpeningRun(toolkit, record) {
    toolkit.state(OPENING_RUN_COOKIE, record)
  }
}
