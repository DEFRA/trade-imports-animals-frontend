import { randomUUID } from 'node:crypto'

/**
 * RECORDS — the durable persistence port (in-memory stub). Records are
 * deep-copied across the boundary both ways (`structuredClone`) so callers can
 * never mutate stored state by reference. There is NO delete-a-key surface,
 * only whole-map `saveAnswers`, so scope-exit wipe stays derived by `reconcile`
 * — the ports cannot hand-roll a wipe.
 */
export const IN_PROGRESS = 'in-progress'
export const SUBMITTED = 'submitted'

const journeys = new Map()
const byUser = new Map()

const assertWritable = (journey) => {
  if (journey.status === SUBMITTED) {
    throw new Error(
      `Journey "${journey.journeyId}" is submitted — writes blocked`
    )
  }
}

/**
 * The single gate in front of every mutating op — unknown id throws, submitted
 * throws (the one-way freeze) — so no writer can skip either check.
 */
const loadWritable = (journeyId) => {
  const journey = journeys.get(journeyId)
  if (!journey) throw new Error(`Unknown journey "${journeyId}"`)
  assertWritable(journey)
  return journey
}

export const records = {
  /** Zero-arg tolerated (userId -> null) so the legacy shim's `store.create()` still works. */
  create({ userId } = {}) {
    const journey = {
      journeyId: randomUUID(),
      userId: userId ?? null,
      status: IN_PROGRESS,
      submittedAt: null,
      answers: {}
    }
    journeys.set(journey.journeyId, journey)
    if (journey.userId != null) byUser.set(journey.userId, journey.journeyId)
    return structuredClone(journey)
  },

  load({ journeyId, userId } = {}) {
    const resolvedJourneyId =
      journeyId ?? (userId != null ? byUser.get(userId) : undefined)
    if (resolvedJourneyId == null) return undefined
    const journey = journeys.get(resolvedJourneyId)
    return journey ? structuredClone(journey) : undefined
  },

  has(journeyId) {
    return journeys.has(journeyId)
  },

  saveAnswers(journeyId, answers) {
    const journey = loadWritable(journeyId)
    journey.answers = structuredClone(answers ?? {})
    return structuredClone(journey)
  },

  finalise(journeyId) {
    const journey = loadWritable(journeyId)
    journey.status = SUBMITTED
    journey.submittedAt = new Date().toISOString()
    return structuredClone(journey)
  },

  /** Test hygiene only. */
  clear() {
    journeys.clear()
    byUser.clear()
  }
}
