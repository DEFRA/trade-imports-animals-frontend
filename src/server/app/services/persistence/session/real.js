import {
  flowOnlyAnswersCookie,
  knownJourneysCookie,
  openingRunCookie,
  openingRunEntryCookie,
  reviewedConcurrencyTokensCookie
} from '../../../engine/persistence/session.js'
import { isObject } from '../../../lib/object.js'

const knownFrom = (request) => {
  const known = request?.yar?.get(knownJourneysCookie())
  return Array.isArray(known) ? known : []
}

const byJourneyFrom = (request, cookieName) => {
  const stored = request?.yar?.get(cookieName)
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
    h.request.yar.set(knownJourneysCookie(), [...known, journeyId])
  },

  async openingRun(request, journeyId) {
    return byJourneyFrom(request, openingRunCookie())[journeyId]
  },

  async setOpeningRun(h, journeyId, phase) {
    const byJourney = byJourneyFrom(h.request, openingRunCookie())
    h.request.yar.set(openingRunCookie(), {
      ...byJourney,
      [journeyId]: phase
    })
  },

  async openingRunEntry(request, journeyId) {
    return byJourneyFrom(request, openingRunEntryCookie())[journeyId]
  },

  async setOpeningRunEntry(h, journeyId, entry) {
    h.request.yar.set(openingRunEntryCookie(), {
      ...byJourneyFrom(h.request, openingRunEntryCookie()),
      [journeyId]: entry
    })
  },

  async flowOnlyAnswers(request, journeyId) {
    const values = byJourneyFrom(request, flowOnlyAnswersCookie())[journeyId]
    return isObject(values) ? structuredClone(values) : {}
  },

  async setFlowOnlyAnswers(h, journeyId, values) {
    const byJourney = byJourneyFrom(h.request, flowOnlyAnswersCookie())
    const next = {
      ...byJourney,
      [journeyId]: structuredClone(values ?? {})
    }
    h.request.yar.set(flowOnlyAnswersCookie(), next)
    return structuredClone(next[journeyId])
  },

  async reviewedConcurrencyToken(request, journeyId) {
    return byJourneyFrom(request, reviewedConcurrencyTokensCookie())[journeyId]
  },

  async setReviewedConcurrencyToken(h, journeyId, token) {
    h.request.yar.set(reviewedConcurrencyTokensCookie(), {
      ...byJourneyFrom(h.request, reviewedConcurrencyTokensCookie()),
      [journeyId]: token
    })
  }
}
