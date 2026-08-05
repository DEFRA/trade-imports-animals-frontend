import {
  KNOWN_JOURNEYS_COOKIE,
  OPENING_RUN_COOKIE,
  FLOW_ONLY_ANSWERS_COOKIE
} from '../../../engine/persistence/session.js'

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const knownFrom = (request) => {
  const known = request?.yar?.get(KNOWN_JOURNEYS_COOKIE)
  return Array.isArray(known) ? known : []
}

const flowOnlyByJourneyFrom = (request) => {
  const stored = request?.yar?.get(FLOW_ONLY_ANSWERS_COOKIE)
  return isObject(stored) ? stored : {}
}

const openingRunByJourneyFrom = (request) => {
  const stored = request?.yar?.get(OPENING_RUN_COOKIE)
  return isObject(stored) ? stored : {}
}

export const session = {
  async knownJourneyIds(request) {
    return knownFrom(request)
  },

  async addKnownJourney(request, h, journeyId) {
    const known = knownFrom(request)
    if (known.includes(journeyId)) {
      return
    }
    h.request.yar.set(KNOWN_JOURNEYS_COOKIE, [...known, journeyId])
  },

  async openingRun(request, journeyId) {
    return openingRunByJourneyFrom(request)[journeyId]
  },

  async setOpeningRun(h, journeyId, phase) {
    const byJourney = openingRunByJourneyFrom(h.request)
    h.request.yar.set(OPENING_RUN_COOKIE, {
      ...byJourney,
      [journeyId]: phase
    })
  },

  async flowOnlyAnswers(request, journeyId) {
    const values = flowOnlyByJourneyFrom(request)[journeyId]
    return isObject(values) ? structuredClone(values) : {}
  },

  async setFlowOnlyAnswers(h, journeyId, values) {
    const byJourney = flowOnlyByJourneyFrom(h.request)
    const next = {
      ...byJourney,
      [journeyId]: structuredClone(values ?? {})
    }
    h.request.yar.set(FLOW_ONLY_ANSWERS_COOKIE, next)
    return structuredClone(next[journeyId])
  }
}
