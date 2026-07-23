import { randomInt } from 'node:crypto'
import { IN_PROGRESS, SUBMITTED } from '../../../engine/persistence/records.js'
import {
  decodePersistedFulfilment,
  encodeEvaluatorFulfilments
} from './fulfilment-codec.js'

const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const REFERENCE_BODY_LENGTH = 6

const mintReferenceNumber = () => {
  const year = String(new Date().getFullYear() % 100).padStart(2, '0')
  const body = Array.from(
    { length: REFERENCE_BODY_LENGTH },
    () => CROCKFORD_BASE32[randomInt(CROCKFORD_BASE32.length)]
  ).join('')
  return `GBN-AG-${year}-${body}`
}

const journeys = new Map()
const byUser = new Map()

const marshal = (document) => ({
  journeyId: document.id,
  userId: document.userId,
  status: document.status,
  createdAt: document.createdAt,
  submittedAt: document.submittedAt,
  fulfilment: decodePersistedFulfilment(document.fulfilment)
})

const assertWritable = (journey) => {
  if (journey.status === SUBMITTED) {
    throw new Error(`Journey "${journey.id}" is submitted — writes blocked`)
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
    const document = {
      id: mintReferenceNumber(),
      userId: userId ?? null,
      status: IN_PROGRESS,
      createdAt: new Date().toISOString(),
      submittedAt: null,
      fulfilment: []
    }
    journeys.set(document.id, document)
    if (document.userId != null) byUser.set(document.userId, document.id)
    return structuredClone(marshal(document))
  },

  async load({ journeyId, userId } = {}) {
    const resolvedJourneyId =
      journeyId ?? (userId != null ? byUser.get(userId) : undefined)
    if (resolvedJourneyId == null) return undefined
    const journey = journeys.get(resolvedJourneyId)
    return journey ? structuredClone(marshal(journey)) : undefined
  },

  async list({ journeyIds = [] } = {}) {
    return journeyIds
      .map((journeyId) => journeys.get(journeyId))
      .filter(Boolean)
      .map((journey) => structuredClone(marshal(journey)))
  },

  async has(journeyId) {
    return journeys.has(journeyId)
  },

  async replaceFulfilment(journeyId, fulfilment) {
    const journey = loadWritable(journeyId)
    journey.fulfilment = structuredClone(
      encodeEvaluatorFulfilments(fulfilment ?? {})
    )
    return structuredClone(marshal(journey))
  },

  async finalise(journeyId) {
    const journey = loadWritable(journeyId)
    journey.status = SUBMITTED
    journey.submittedAt = new Date().toISOString()
    return structuredClone(marshal(journey))
  },

  async amend(journeyId) {
    const journey = journeys.get(journeyId)
    if (!journey) throw new Error(`Unknown journey "${journeyId}"`)
    if (journey.status !== SUBMITTED) {
      throw new Error(`Journey "${journeyId}" is not submitted — cannot amend`)
    }
    journey.status = IN_PROGRESS
    journey.submittedAt = null
    return structuredClone(marshal(journey))
  },

  async clear() {
    journeys.clear()
    byUser.clear()
  }
}
