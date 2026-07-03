import { randomUUID } from 'node:crypto'

/**
 * The persistence seam — one Journey document per journeyId over an
 * in-memory Map, deep-copied across the boundary both ways so callers
 * can never mutate stored state by reference. Explicitly NON-precedential:
 * the in-memory Map exists so a throwaway spike can run; the real
 * datastore decision is out of scope.
 *
 * Only `answers` is mutable, and ALL writes are rejected once submitted
 * (the one-way in-progress -> submitted freeze).
 */
export const IN_PROGRESS = 'in-progress'
export const SUBMITTED = 'submitted'

const journeys = new Map()

const assertWritable = (journey) => {
  if (journey.status === SUBMITTED) {
    throw new Error(
      `Journey "${journey.journeyId}" is submitted — writes blocked`
    )
  }
}

export const store = {
  create() {
    const journey = {
      journeyId: randomUUID(),
      status: IN_PROGRESS,
      submittedAt: null,
      answers: {}
    }
    journeys.set(journey.journeyId, journey)
    return structuredClone(journey)
  },

  get(journeyId) {
    const journey = journeys.get(journeyId)
    return journey ? structuredClone(journey) : undefined
  },

  has(journeyId) {
    return journeys.has(journeyId)
  },

  /** Replace the answers map — the only mutable key. */
  saveAnswers(journeyId, answers) {
    const journey = journeys.get(journeyId)
    if (!journey) throw new Error(`Unknown journey "${journeyId}"`)
    assertWritable(journey)
    journey.answers = structuredClone(answers ?? {})
    return structuredClone(journey)
  },

  /** The one-way in-progress -> submitted flip; re-submit throws. */
  submit(journeyId) {
    const journey = journeys.get(journeyId)
    if (!journey) throw new Error(`Unknown journey "${journeyId}"`)
    assertWritable(journey)
    journey.status = SUBMITTED
    journey.submittedAt = new Date().toISOString()
    return structuredClone(journey)
  },

  /** Test hygiene only. */
  clear() {
    journeys.clear()
  }
}
