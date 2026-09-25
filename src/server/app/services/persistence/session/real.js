/**
 * The real session: every value lives inside the ONE @hapi/yar session cookie,
 * which yar registers server-wide at path `/`.
 *
 * So the per-set `path` scoping `registerJourneyCookie` applies is a stub-mode
 * property only. Here two sets are kept apart by their cookie NAMES — the
 * per-set names from the configured session seam become distinct keys inside
 * the one yar session. Namespacing those keys by set id as well is a behaviour
 * change, not a tidy-up, and belongs in its own ticket.
 */
import {
  flowOnlyAnswersCookie,
  knownJourneysCookie,
  openingRunCookie
} from '../../../engine/persistence/session.js'

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const knownFrom = (request) => {
  const known = request?.yar?.get(knownJourneysCookie())
  return Array.isArray(known) ? known : []
}

const flowOnlyByJourneyFrom = (request) => {
  const stored = request?.yar?.get(flowOnlyAnswersCookie())
  return isObject(stored) ? stored : {}
}

const openingRunByJourneyFrom = (request) => {
  const stored = request?.yar?.get(openingRunCookie())
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
    return openingRunByJourneyFrom(request)[journeyId]
  },

  async setOpeningRun(h, journeyId, phase) {
    const byJourney = openingRunByJourneyFrom(h.request)
    h.request.yar.set(openingRunCookie(), {
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
    h.request.yar.set(flowOnlyAnswersCookie(), next)
    return structuredClone(next[journeyId])
  }
}
