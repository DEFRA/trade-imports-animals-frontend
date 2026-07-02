import { randomUUID } from 'node:crypto'

/**
 * The journey persistence seam (obligations.md:651-689). One Journey
 * document per journeyId, a minimal 7-key envelope over an in-memory Map:
 * `{ journeyId, flowId, status, createdAt, updatedAt, submittedAt,
 * fulfilments }`. Derived state (statuses, journey lifecycle) is never
 * stored — it is recomputed from fulfilments on every request.
 *
 * Write rules: ONLY `fulfilments` is mutable, and ALL writes are rejected
 * once the journey is submitted — the one-way in-progress -> submitted
 * flip stamps `submittedAt` and freezes the document (SUBMIT-4..7,
 * Rulings item 1). Deep copies cross the boundary in both directions so
 * callers can never mutate stored state by reference.
 *
 * Explicitly NON-PRECEDENTIAL datastore stance (SUBMIT-1..3): the
 * in-memory Map exists so a throwaway spike can run; the real datastore
 * decision is urgent and belongs to decision-makers with Defra-wide
 * input. Nothing here reduces that urgency.
 */

export const IN_PROGRESS = 'in-progress'
export const SUBMITTED = 'submitted'

/** `now` is injectable for deterministic timestamp tests. */
export function createJourneyRepository({
  now = () => new Date().toISOString()
} = {}) {
  const journeys = new Map()

  const stored = (journeyId) => {
    const journey = journeys.get(journeyId)
    if (!journey) {
      throw new Error(`Unknown journey "${journeyId}"`)
    }
    return journey
  }

  const assertWritable = (journey) => {
    if (journey.status === SUBMITTED) {
      throw new Error(
        `Journey "${journey.journeyId}" is submitted — writes are blocked`
      )
    }
  }

  return {
    /** Mint a new in-progress journey for one Flow. */
    create(flowId) {
      const createdAt = now()
      const journey = {
        journeyId: randomUUID(),
        flowId,
        status: IN_PROGRESS,
        createdAt,
        updatedAt: createdAt,
        submittedAt: null,
        fulfilments: {}
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

    /** Replace the fulfilments map — the only mutable envelope key. */
    saveFulfilments(journeyId, fulfilments) {
      const journey = stored(journeyId)
      assertWritable(journey)
      journey.fulfilments = structuredClone(fulfilments ?? {})
      journey.updatedAt = now()
      return structuredClone(journey)
    },

    /** The one-way in-progress -> submitted flip; re-submit throws. */
    submit(journeyId) {
      const journey = stored(journeyId)
      assertWritable(journey)
      journey.status = SUBMITTED
      journey.submittedAt = now()
      journey.updatedAt = journey.submittedAt
      return structuredClone(journey)
    },

    /** Test hygiene only — wipe every stored journey. */
    clear() {
      journeys.clear()
    }
  }
}
