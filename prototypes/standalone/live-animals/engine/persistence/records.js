import { randomUUID } from 'node:crypto'

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

const loadWritable = (journeyId) => {
  const journey = journeys.get(journeyId)
  if (!journey) throw new Error(`Unknown journey "${journeyId}"`)
  assertWritable(journey)
  return journey
}

export const records = {
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

  clear() {
    journeys.clear()
    byUser.clear()
  }
}
