import {
  knownJourneysCookie,
  openingRunCookie,
  flowOnlyAnswersCookie
} from '../../../engine/persistence/session.js'

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const knownFrom = (request) => {
  const known = request?.state?.[knownJourneysCookie()]
  return Array.isArray(known) ? known : []
}

const flowOnlyByJourneyFrom = (request) => {
  const stored = request?.state?.[flowOnlyAnswersCookie()]
  return isObject(stored) ? stored : {}
}

const openingRunByJourneyFrom = (request) => {
  const stored = request?.state?.[openingRunCookie()]
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
    toolkit.state(knownJourneysCookie(), [...known, journeyId])
  },

  async openingRun(request, journeyId) {
    return openingRunByJourneyFrom(request)[journeyId]
  },

  async setOpeningRun(toolkit, journeyId, phase, request) {
    const byJourney = openingRunByJourneyFrom(request ?? toolkit?.request)
    toolkit.state(openingRunCookie(), {
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
    toolkit.state(flowOnlyAnswersCookie(), next)
    return structuredClone(next[journeyId])
  }
}
