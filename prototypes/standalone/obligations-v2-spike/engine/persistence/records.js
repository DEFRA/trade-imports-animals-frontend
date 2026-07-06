import { randomUUID } from 'node:crypto'

/**
 * RECORDS — the durable persistence port. Durable source of truth for one
 * application (Journey) document per journeyId, over an in-memory Map, deep-
 * copied across the boundary both ways so callers can never mutate stored state
 * by reference. Explicitly a STUB: the Map stands in for the real datastore
 * (Mongo, reached via the backend API) so a throwaway spike can run. `answers`
 * is the only repeatedly-writable field; `status`/`submittedAt` are set once by
 * `finalise`. ALL writes are rejected once submitted (the one-way
 * in-progress -> submitted freeze).
 *
 * A record is `{ journeyId, userId, status, submittedAt, answers }`. Two backing
 * maps: `journeys` keyed by journeyId (the record) and `byUser` keyed by userId
 * (the id of that user's active journey — last-writer-wins). There is NO delete-
 * a-key surface, only whole-map `saveAnswers`, so scope-exit wipe stays derived
 * by `reconcile` and applied by `destroyWiped` — the ports cannot hand-roll a
 * wipe. NOTE: multi-draft-per-user is an OPEN product question, not decided here.
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

export const records = {
  /**
   * Mint a fresh in-progress record and index it by id and by user. Zero-arg is
   * tolerated (userId -> null) so the legacy shim's `store.create()` still works.
   * Prod seam: POST /applications.
   */
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

  /**
   * Polymorphic load — the `byId OR byUser` requirement in one method.
   * `load({ journeyId })` -> clone of that record or undefined.
   * `load({ userId })` -> clone of the user's active record or undefined.
   * Prod seam: GET /applications/{id} or GET /applications?userId=.
   */
  load({ journeyId, userId } = {}) {
    const id = journeyId ?? (userId != null ? byUser.get(userId) : undefined)
    if (id == null) return undefined
    const journey = journeys.get(id)
    return journey ? structuredClone(journey) : undefined
  },

  has(journeyId) {
    return journeys.has(journeyId)
  },

  /**
   * WRITE-THROUGH — replace the answers map (the only mutable key). Called on
   * EVERY commit, so durable state is current before submit ever runs. Whole-map
   * only: no delete-a-key surface. Prod seam: PATCH /applications/{id}/answers.
   */
  saveAnswers(journeyId, answers) {
    const journey = journeys.get(journeyId)
    if (!journey) throw new Error(`Unknown journey "${journeyId}"`)
    assertWritable(journey)
    journey.answers = structuredClone(answers ?? {})
    return structuredClone(journey)
  },

  /**
   * The submit step — flip in-progress -> submitted and stamp `submittedAt`.
   * Writes NO answers (they are already durable from per-commit write-through);
   * the record's `answers` ARE the application. Re-finalise throws (the freeze).
   * Prod seam: POST /applications/{id}/submit.
   */
  finalise(journeyId) {
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
    byUser.clear()
  }
}
