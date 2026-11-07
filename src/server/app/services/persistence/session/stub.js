import {
  flowOnlyAnswersCookie,
  knownJourneysCookie,
  openingRunCookie,
  reviewedConcurrencyTokensCookie
} from '../../../engine/persistence/session.js'
import { isObject } from '../../../lib/object.js'

const knownFrom = (request) => {
  const known = request?.state?.[knownJourneysCookie()]
  return Array.isArray(known) ? known : []
}

const byJourneyFrom = (request, cookieName) => {
  const stored = request?.state?.[cookieName]
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
    return byJourneyFrom(request, openingRunCookie())[journeyId]
  },

  async setOpeningRun(h, journeyId, phase, request) {
    const byJourney = byJourneyFrom(request ?? h?.request, openingRunCookie())
    h.state(openingRunCookie(), {
      ...byJourney,
      [journeyId]: phase
    })
  },

  async flowOnlyAnswers(request, journeyId) {
    const values = byJourneyFrom(request, flowOnlyAnswersCookie())[journeyId]
    return isObject(values) ? structuredClone(values) : {}
  },

  async setFlowOnlyAnswers(h, journeyId, values, request) {
    const byJourney = byJourneyFrom(
      request ?? h?.request,
      flowOnlyAnswersCookie()
    )
    const next = {
      ...byJourney,
      [journeyId]: structuredClone(values ?? {})
    }
    h.state(flowOnlyAnswersCookie(), next)
    return structuredClone(next[journeyId])
  },

  async reviewedConcurrencyToken(request, journeyId) {
    return byJourneyFrom(request, reviewedConcurrencyTokensCookie())[journeyId]
  },

  async setReviewedConcurrencyToken(h, journeyId, token, request) {
    h.state(reviewedConcurrencyTokensCookie(), {
      ...byJourneyFrom(
        request ?? h?.request,
        reviewedConcurrencyTokensCookie()
      ),
      [journeyId]: token
    })
  }
}
