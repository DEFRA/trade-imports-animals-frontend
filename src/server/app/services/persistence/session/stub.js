import {
  flowOnlyAnswersCookie,
  knownJourneysCookie,
  openingRunCookie,
  reviewedConcurrencyTokensCookie
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

const reviewedConcurrencyTokensFrom = (request) => {
  const stored = request?.state?.[reviewedConcurrencyTokensCookie()]
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
    h.state(knownJourneysCookie(), [...known, journeyId])
  },

  async openingRun(request, journeyId) {
    return openingRunByJourneyFrom(request)[journeyId]
  },

  async setOpeningRun(h, journeyId, phase, request) {
    const byJourney = openingRunByJourneyFrom(request ?? h?.request)
    h.state(openingRunCookie(), {
      ...byJourney,
      [journeyId]: phase
    })
  },

  async flowOnlyAnswers(request, journeyId) {
    const values = flowOnlyByJourneyFrom(request)[journeyId]
    return isObject(values) ? structuredClone(values) : {}
  },

  async setFlowOnlyAnswers(h, journeyId, values, request) {
    const byJourney = flowOnlyByJourneyFrom(request ?? h?.request)
    const next = {
      ...byJourney,
      [journeyId]: structuredClone(values ?? {})
    }
    h.state(flowOnlyAnswersCookie(), next)
    return structuredClone(next[journeyId])
  },

  async reviewedConcurrencyToken(request, journeyId) {
    return reviewedConcurrencyTokensFrom(request)[journeyId]
  },

  async setReviewedConcurrencyToken(h, journeyId, token, request) {
    h.state(reviewedConcurrencyTokensCookie(), {
      ...reviewedConcurrencyTokensFrom(request ?? h?.request),
      [journeyId]: token
    })
  }
}
