import { randomInt } from 'node:crypto'
import { IN_PROGRESS, SUBMITTED } from '../../../engine/persistence/records.js'

const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

const mintReferenceNumber = () => {
  const year = String(new Date().getFullYear() % 100).padStart(2, '0')
  const body = Array.from(
    { length: 6 },
    () => CROCKFORD_BASE32[randomInt(CROCKFORD_BASE32.length)]
  ).join('')
  return `GBN-AG-${year}-${body}`
}

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
  async create({ userId } = {}) {
    const journey = {
      journeyId: mintReferenceNumber(),
      userId: userId ?? null,
      status: IN_PROGRESS,
      createdAt: new Date().toISOString(),
      submittedAt: null,
      answers: {}
    }
    journeys.set(journey.journeyId, journey)
    if (journey.userId != null) byUser.set(journey.userId, journey.journeyId)
    return structuredClone(journey)
  },

  async load({ journeyId, userId } = {}) {
    const resolvedJourneyId =
      journeyId ?? (userId != null ? byUser.get(userId) : undefined)
    if (resolvedJourneyId == null) return undefined
    const journey = journeys.get(resolvedJourneyId)
    return journey ? structuredClone(journey) : undefined
  },

  async list({ journeyIds = [] } = {}) {
    return journeyIds
      .map((journeyId) => journeys.get(journeyId))
      .filter(Boolean)
      .map((journey) => structuredClone(journey))
  },

  async has(journeyId) {
    return journeys.has(journeyId)
  },

  async saveAnswers(journeyId, answers) {
    const journey = loadWritable(journeyId)
    journey.answers = structuredClone(answers ?? {})
    return structuredClone(journey)
  },

  async finalise(journeyId) {
    const journey = loadWritable(journeyId)
    journey.status = SUBMITTED
    journey.submittedAt = new Date().toISOString()
    return structuredClone(journey)
  },

  async amend(journeyId) {
    const journey = journeys.get(journeyId)
    if (!journey) throw new Error(`Unknown journey "${journeyId}"`)
    if (journey.status !== SUBMITTED) {
      throw new Error(`Journey "${journeyId}" is not submitted — cannot amend`)
    }
    journey.status = IN_PROGRESS
    journey.submittedAt = null
    return structuredClone(journey)
  },

  async clear() {
    journeys.clear()
    byUser.clear()
  }
}
