import { STUB_USER } from '../../../engine/persistence/session.js'

const ACTIVE_JOURNEY = 'liveAnimalsActiveJourney'
const KNOWN_JOURNEYS = 'liveAnimalsKnownJourneys'
const OPENING_RUN = 'liveAnimalsOpeningRun'
const FLOW_ONLY_ANSWERS = 'liveAnimalsFlowOnlyAnswers'

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const knownFrom = (request) => {
  const known = request?.yar?.get(KNOWN_JOURNEYS)
  return Array.isArray(known) ? known : []
}

const flowOnlyByJourneyFrom = (request) => {
  const stored = request?.yar?.get(FLOW_ONLY_ANSWERS)
  return isObject(stored) ? stored : {}
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
  },

  async openingRun(request) {
    return request?.yar?.get(OPENING_RUN) ?? undefined
  },

  async setOpeningRun(h, record) {
    h.request.yar.set(OPENING_RUN, record)
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
    h.request.yar.set(FLOW_ONLY_ANSWERS, next)
    return structuredClone(next[journeyId])
  }
}
