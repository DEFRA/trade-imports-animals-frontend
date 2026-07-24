import { randomInt } from 'node:crypto'
import {
  AMEND,
  DELETED,
  DRAFT,
  SUBMITTED
} from '../../../engine/persistence/records.js'
import {
  decodePersistedFulfilment,
  encodeEvaluatorFulfilments
} from './fulfilment-codec.js'
import { projectAnswers } from '../../../bridge/fulfilments.js'

const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const REFERENCE_BODY_LENGTH = 6
const LIST_PAGE_SIZE = 20

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
const copiesByOwnerAndKey = new Map()

const ownerKey = (owner) =>
  `${owner?.sub ?? ''}\u0000${owner?.organisation ?? ''}`

const sameOwner = (journey, owner) =>
  ownerKey(journey.owner) === ownerKey(owner)

const marshal = (document) => ({
  journeyId: document.id,
  userId: document.userId,
  status: document.status,
  createdAt: document.createdAt,
  submittedAt: document.submittedAt,
  fulfilment: decodePersistedFulfilment(document.fulfilment)
})

const isoFromDateParts = (parts) => {
  const { day, month, year } = parts ?? {}
  if (day == null || month == null || year == null) return null
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const marshalListItem = (document) => {
  const answers = projectAnswers(decodePersistedFulfilment(document.fulfilment))
  const commodityName = answers.commodityLines?.[0]?.commoditySelection

  return {
    journeyId: document.id,
    status: document.status,
    createdAt: document.createdAt,
    submittedAt: document.submittedAt,
    reference: document.id,
    commodity: commodityName ? { name: commodityName } : null,
    originCountryCode: answers.countryOfOrigin ?? null,
    arrivalDate: isoFromDateParts(answers.arrivalDateAtPort),
    consignorName: answers.consignor?.name ?? null,
    consigneeName: answers.consignee?.name ?? null
  }
}

const validPage = (page) => (Number.isInteger(page) && page > 0 ? page : 1)

const sortByCreatedAt = (sort) => {
  const direction = sort?.endsWith(',asc') ? 1 : -1
  return (left, right) =>
    direction * left.createdAt.localeCompare(right.createdAt)
}

const assertWritable = (journey) => {
  if (journey.status !== DRAFT && journey.status !== AMEND) {
    throw new Error(
      `Journey "${journey.id}" is ${journey.status} — writes blocked`
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
  async create({ userId, owner } = {}) {
    const document = {
      id: mintReferenceNumber(),
      userId: userId ?? owner?.sub ?? null,
      owner: owner == null ? null : structuredClone(owner),
      status: DRAFT,
      createdAt: new Date().toISOString(),
      submittedAt: null,
      fulfilment: []
    }
    journeys.set(document.id, document)
    if (document.userId != null) byUser.set(document.userId, document.id)
    return structuredClone(marshal(document))
  },

  async load({ journeyId, userId, owner: _owner } = {}) {
    const resolvedJourneyId =
      journeyId ?? (userId != null ? byUser.get(userId) : undefined)
    if (resolvedJourneyId == null) return undefined
    const journey = journeys.get(resolvedJourneyId)
    return journey ? structuredClone(marshal(journey)) : undefined
  },

  async list({
    journeyIds = [],
    owner: _owner,
    page = 1,
    sort = 'arrivalDate,desc'
  } = {}) {
    const resolvedPage = validPage(page)
    const rows = journeyIds
      .map((journeyId) => journeys.get(journeyId))
      .filter((journey) => journey && journey.status !== DELETED)
      .map(marshalListItem)
      .sort(sortByCreatedAt(sort))
    const totalElements = rows.length
    const totalPages = Math.ceil(totalElements / LIST_PAGE_SIZE)
    const offset = (resolvedPage - 1) * LIST_PAGE_SIZE

    return {
      rows: structuredClone(rows.slice(offset, offset + LIST_PAGE_SIZE)),
      page: resolvedPage,
      size: LIST_PAGE_SIZE,
      totalElements,
      totalPages
    }
  },

  async has(journeyId) {
    return journeys.has(journeyId)
  },

  async replaceFulfilment(journeyId, fulfilment, { owner: _owner } = {}) {
    const journey = loadWritable(journeyId)
    journey.fulfilment = structuredClone(
      encodeEvaluatorFulfilments(fulfilment ?? {})
    )
    return structuredClone(marshal(journey))
  },

  async finalise(journeyId, _owner) {
    const journey = loadWritable(journeyId)
    journey.status = SUBMITTED
    journey.submittedAt = new Date().toISOString()
    delete journey.submittedSnapshot
    return structuredClone(marshal(journey))
  },

  async amend(journeyId, _owner) {
    const journey = journeys.get(journeyId)
    if (!journey) throw new Error(`Unknown journey "${journeyId}"`)
    if (journey.status !== SUBMITTED) {
      throw new Error(`Journey "${journeyId}" is not submitted — cannot amend`)
    }
    journey.submittedSnapshot = {
      fulfilment: structuredClone(journey.fulfilment),
      submittedAt: journey.submittedAt
    }
    journey.status = AMEND
    journey.submittedAt = null
    return structuredClone(marshal(journey))
  },

  async cancelAmend(journeyId, _owner) {
    const journey = journeys.get(journeyId)
    if (!journey) throw new Error(`Unknown journey "${journeyId}"`)
    if (journey.status !== AMEND || journey.submittedSnapshot == null) {
      throw new Error(
        `Journey "${journeyId}" has no amendment snapshot — cannot cancel amendment`
      )
    }
    journey.fulfilment = structuredClone(journey.submittedSnapshot.fulfilment)
    journey.submittedAt = journey.submittedSnapshot.submittedAt
    journey.status = SUBMITTED
    delete journey.submittedSnapshot
    return structuredClone(marshal(journey))
  },

  async copy(journeyId, owner, idempotencyKey) {
    const dedupeKey = `${ownerKey(owner)}\u0000${idempotencyKey}`
    const existingCopyId = copiesByOwnerAndKey.get(dedupeKey)
    if (existingCopyId) {
      return structuredClone(marshal(journeys.get(existingCopyId)))
    }

    const source = journeys.get(journeyId)
    if (!source || !sameOwner(source, owner)) {
      throw new Error(`Unknown journey "${journeyId}"`)
    }
    if (
      source.status !== DRAFT &&
      source.status !== SUBMITTED &&
      source.status !== AMEND
    ) {
      throw new Error(
        `Journey "${journeyId}" is ${source.status} — cannot copy`
      )
    }

    const document = {
      id: mintReferenceNumber(),
      userId: owner?.sub ?? source.userId ?? null,
      owner: owner == null ? null : structuredClone(owner),
      status: DRAFT,
      createdAt: new Date().toISOString(),
      submittedAt: null,
      fulfilment: structuredClone(source.fulfilment)
    }
    journeys.set(document.id, document)
    if (document.userId != null) byUser.set(document.userId, document.id)
    copiesByOwnerAndKey.set(dedupeKey, document.id)
    return structuredClone(marshal(document))
  },

  async softDelete(journeyId, owner) {
    const journey = journeys.get(journeyId)
    if (!journey || !sameOwner(journey, owner)) {
      throw new Error(`Unknown journey "${journeyId}"`)
    }
    if (
      journey.status !== DRAFT &&
      journey.status !== SUBMITTED &&
      journey.status !== AMEND &&
      journey.status !== DELETED
    ) {
      throw new Error(
        `Journey "${journeyId}" is ${journey.status} — cannot delete`
      )
    }
    journey.status = DELETED
    journey.submittedAt = null
    return structuredClone(marshal(journey))
  },

  async clear() {
    journeys.clear()
    byUser.clear()
    copiesByOwnerAndKey.clear()
  }
}
