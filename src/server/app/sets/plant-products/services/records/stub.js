// In-memory engine-port adapter from docs/add-a-set.md step 8.
import {
  AMEND,
  DELETED,
  DRAFT,
  SUBMITTED
} from '../../../../engine/persistence/records.js'

const recordsById = new Map()
const copiesBySourceAndKey = new Map()
let sequence = 0

const clone = (value) => structuredClone(value)
const mintReference = () => {
  sequence += 1
  return `GBN-PP-${String(sequence).padStart(6, '0')}`
}

const read = (journeyId) => {
  const record = recordsById.get(journeyId)
  if (!record) throw new Error(`Unknown journey "${journeyId}"`)
  return record
}

const writable = (journeyId) => {
  const record = read(journeyId)
  if (record.status !== DRAFT && record.status !== AMEND) {
    throw new Error(
      `Journey "${journeyId}" is ${record.status} — cannot replace fulfilment`
    )
  }
  return record
}

const toJourney = (record) => ({
  journeyId: record.journeyId,
  reference: record.reference,
  status: record.status,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
  submittedAt: record.submittedAt,
  fulfilment: clone(record.fulfilment)
})

const touch = (record) => {
  record.updatedAt = new Date().toISOString()
}

export const create = async () => {
  const reference = mintReference()
  const now = new Date().toISOString()
  const record = {
    journeyId: reference,
    reference,
    status: DRAFT,
    createdAt: now,
    updatedAt: now,
    submittedAt: null,
    fulfilment: []
  }
  recordsById.set(reference, record)
  return clone(toJourney(record))
}

export const load = async ({ journeyId } = {}) => {
  const record = recordsById.get(journeyId)
  return record ? clone(toJourney(record)) : undefined
}

export const list = async ({ journeyIds, page = 1 } = {}) => {
  const allowed = journeyIds === undefined ? null : new Set(journeyIds)
  const rows = [...recordsById.values()]
    .filter(({ journeyId }) => allowed === null || allowed.has(journeyId))
    .filter(({ status }) => status !== DELETED)
    .map((record) => ({
      journeyId: record.journeyId,
      reference: record.reference,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      submittedAt: record.submittedAt
    }))
  return {
    rows: clone(rows),
    page,
    size: rows.length,
    totalElements: rows.length,
    totalPages: rows.length === 0 ? 0 : 1
  }
}

export const has = async (journeyId) => recordsById.has(journeyId)

export const replaceFulfilment = async (journeyId, fulfilment) => {
  const record = writable(journeyId)
  record.fulfilment = clone(fulfilment ?? [])
  touch(record)
  return clone(toJourney(record))
}

export const finalise = async (journeyId) => {
  const record = read(journeyId)
  if (record.status !== DRAFT && record.status !== AMEND) {
    throw new Error(
      `Journey "${journeyId}" is ${record.status} — cannot finalise`
    )
  }
  record.status = SUBMITTED
  record.submittedAt = new Date().toISOString()
  delete record.submittedSnapshot
  touch(record)
  return clone(toJourney(record))
}

export const amend = async (journeyId) => {
  const record = read(journeyId)
  if (record.status !== SUBMITTED) {
    throw new Error(`Journey "${journeyId}" is ${record.status} — cannot amend`)
  }
  record.submittedSnapshot = {
    fulfilment: clone(record.fulfilment),
    submittedAt: record.submittedAt
  }
  record.status = AMEND
  record.submittedAt = null
  touch(record)
  return clone(toJourney(record))
}

export const cancelAmend = async (journeyId) => {
  const record = read(journeyId)
  if (record.status !== AMEND || record.submittedSnapshot === undefined) {
    throw new Error(`Journey "${journeyId}" cannot cancel amendment`)
  }
  record.fulfilment = clone(record.submittedSnapshot.fulfilment)
  record.submittedAt = record.submittedSnapshot.submittedAt
  record.status = SUBMITTED
  delete record.submittedSnapshot
  touch(record)
  return clone(toJourney(record))
}

export const copy = async (journeyId, idempotencyKey = '') => {
  const source = read(journeyId)
  if (source.status === DELETED) {
    throw new Error(`Journey "${journeyId}" is deleted — cannot copy`)
  }
  const dedupeKey = `${journeyId}\u0000${idempotencyKey}`
  const existing = copiesBySourceAndKey.get(dedupeKey)
  if (existing) return clone(toJourney(read(existing)))
  const created = await create()
  const target = read(created.journeyId)
  target.fulfilment = clone(source.fulfilment)
  copiesBySourceAndKey.set(dedupeKey, target.journeyId)
  return clone(toJourney(target))
}

export const softDelete = async (journeyId) => {
  const record = read(journeyId)
  if (![DRAFT, SUBMITTED, AMEND, DELETED].includes(record.status)) {
    throw new Error(
      `Journey "${journeyId}" is ${record.status} — cannot delete`
    )
  }
  record.status = DELETED
  record.submittedAt = null
  touch(record)
  return clone(toJourney(record))
}

export const clear = async () => {
  recordsById.clear()
  copiesBySourceAndKey.clear()
  sequence = 0
}

export const records = {
  create,
  load,
  list,
  has,
  replaceFulfilment,
  finalise,
  amend,
  cancelAmend,
  copy,
  softDelete,
  clear
}
