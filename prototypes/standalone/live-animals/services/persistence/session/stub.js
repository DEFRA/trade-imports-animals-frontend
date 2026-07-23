import {
  STUB_USER,
  STUB_USER_HEADER,
  JOURNEY_COOKIE,
  KNOWN_JOURNEYS_COOKIE,
  OPENING_RUN_COOKIE,
  FLOW_ONLY_ANSWERS_COOKIE
} from '../../../engine/persistence/session.js'

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const knownFrom = (request) => {
  const known = request?.state?.[KNOWN_JOURNEYS_COOKIE]
  return Array.isArray(known) ? known : []
}

const flowOnlyByJourneyFrom = (request) => {
  const stored = request?.state?.[FLOW_ONLY_ANSWERS_COOKIE]
  return isObject(stored) ? stored : {}
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
  },

  async flowOnlyAnswers(request, journeyId) {
    const values = flowOnlyByJourneyFrom(request)[journeyId]
    return isObject(values) ? structuredClone(values) : {}
  },

  async setFlowOnlyAnswers(toolkit, journeyId, values, request) {
    const byJourney = flowOnlyByJourneyFrom(request ?? toolkit?.request)
    const next = {
      ...byJourney,
      [journeyId]: structuredClone(values ?? {})
    }
    toolkit.state(FLOW_ONLY_ANSWERS_COOKIE, next)
    return structuredClone(next[journeyId])
  }
}
