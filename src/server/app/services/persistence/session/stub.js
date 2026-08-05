import { SESSION_COOKIES } from '../../../engine/persistence/session.js'

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const knownFrom = (request) => {
  const known = request?.state?.[SESSION_COOKIES.knownJourneys]
  return Array.isArray(known) ? known : []
}

const flowOnlyByJourneyFrom = (request) => {
  const stored = request?.state?.[SESSION_COOKIES.flowOnlyAnswers]
  return isObject(stored) ? stored : {}
}

const openingRunByJourneyFrom = (request) => {
  const stored = request?.state?.[SESSION_COOKIES.openingRun]
  return isObject(stored) ? stored : {}
}

export const session = {
  async knownJourneyIds(request) {
    return knownFrom(request)
  },

  async addKnownJourney(request, toolkit, journeyId) {
    const known = knownFrom(request)
    if (known.includes(journeyId)) {
      return
    }
    toolkit.state(SESSION_COOKIES.knownJourneys, [...known, journeyId])
  },

  async openingRun(request, journeyId) {
    return openingRunByJourneyFrom(request)[journeyId]
  },

  async setOpeningRun(toolkit, journeyId, phase, request) {
    const byJourney = openingRunByJourneyFrom(request ?? toolkit?.request)
    toolkit.state(SESSION_COOKIES.openingRun, {
      ...byJourney,
      [journeyId]: phase
    })
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
    toolkit.state(SESSION_COOKIES.flowOnlyAnswers, next)
    return structuredClone(next[journeyId])
  }
}
