import { randomBytes } from 'node:crypto'

import {
  AMEND,
  DELETED,
  DRAFT,
  SUBMITTED
} from '../../../../engine/persistence/records.js'
import { projectAnswers } from '../../../../bridge/fulfilments/index.js'
import {
  accompanyingDocuments,
  documentReference,
  documentType,
  issueDate
} from '../../obligations/sections/documents.js'

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const PAGE_SIZE = 25
const recordsById = new Map()
const copiesByIdempotencyKey = new Map()
const DOCUMENT_OBLIGATION_IDS = [
  accompanyingDocuments,
  documentType,
  documentReference,
  issueDate
].map(({ id }) => id)

const clone = (value) => structuredClone(value)

const mintReference = () => {
  const year = String(new Date().getFullYear() % 100).padStart(2, '0')
  let reference
  do {
    const suffix = [...randomBytes(6)]
      .map((value) => CROCKFORD[value % CROCKFORD.length])
      .join('')
    reference = `GBN-PP-${year}-${suffix}`
  } while (recordsById.has(reference))
  return reference
}

const read = (journeyId) => {
  const record = recordsById.get(journeyId)
  if (!record) throw new Error(`Unknown journey "${journeyId}"`)
  return record
}

const toJourney = (record) =>
  clone({
    journeyId: record.journeyId,
    status: record.status,
    createdAt: record.createdAt,
    submittedAt: record.submittedAt,
    fulfilment: record.fulfilment
  })

const dashboardFacts = (record) => {
  const answers = projectAnswers(record.fulfilment)
  return {
    originCountryCode: answers.countryOfOrigin ?? null,
    arrivalDate: answers.arrivalDate ?? null
  }
}

const toListItem = (record) => ({
  journeyId: record.journeyId,
  status: record.status,
  createdAt: record.createdAt,
  submittedAt: record.submittedAt,
  ...dashboardFacts(record)
})

const valueForSort = (record, field) =>
  field === 'arrivalDate' ? record.arrivalDate : record.createdAt

const sortListItems = (rows, sort = 'arrivalDate,desc') => {
  const [field, direction] = sort.split(',')
  const multiplier = direction === 'asc' ? 1 : -1
  return rows.sort((first, second) => {
    const firstValue = valueForSort(first, field) ?? ''
    const secondValue = valueForSort(second, field) ?? ''
    const compared = firstValue.localeCompare(secondValue) * multiplier
    return compared || second.createdAt.localeCompare(first.createdAt)
  })
}

const assertWritable = (record) => {
  if (record.status !== DRAFT && record.status !== AMEND) {
    throw new Error(
      `Journey "${record.journeyId}" is ${record.status} — writes blocked`
    )
  }
}

export const create = async () => {
  const journeyId = mintReference()
  const record = {
    journeyId,
    status: DRAFT,
    createdAt: new Date().toISOString(),
    submittedAt: null,
    fulfilment: {}
  }
  recordsById.set(journeyId, record)
  return toJourney(record)
}

export const load = async ({ journeyId } = {}) => {
  const record = recordsById.get(journeyId)
  return record === undefined ? undefined : toJourney(record)
}

export const list = async ({
  journeyIds,
  page = 1,
  sort = 'arrivalDate,desc',
  referenceNumber
} = {}) => {
  const allowed = journeyIds === undefined ? null : new Set(journeyIds)
  const reference = referenceNumber?.trim() || undefined
  const matching = sortListItems(
    [...recordsById.values()]
      .filter(
        (record) =>
          record.status !== DELETED &&
          (allowed === null || allowed.has(record.journeyId)) &&
          (reference === undefined || record.journeyId === reference)
      )
      .map(toListItem),
    sort
  )
  const start = (page - 1) * PAGE_SIZE
  return {
    rows: matching.slice(start, start + PAGE_SIZE),
    page,
    size: PAGE_SIZE,
    totalElements: matching.length,
    totalPages: Math.ceil(matching.length / PAGE_SIZE)
  }
}

export const has = async (journeyId) => recordsById.has(journeyId)

export const replaceFulfilment = async (journeyId, fulfilment) => {
  const record = read(journeyId)
  assertWritable(record)
  record.fulfilment = clone(fulfilment ?? {})
  return toJourney(record)
}

export const finalise = async (journeyId) => {
  const record = read(journeyId)
  if (record.status !== DRAFT && record.status !== AMEND) {
    throw new Error(
      `Journey "${journeyId}" is ${record.status} — cannot finalise`
    )
  }
  record.declaration = {
    agreed: true,
    declaredAt: new Date().toISOString()
  }
  record.status = SUBMITTED
  record.submittedAt = record.declaration.declaredAt
  delete record.submittedSnapshot
  return toJourney(record)
}

export const amend = async (journeyId) => {
  const record = read(journeyId)
  if (record.status !== SUBMITTED) {
    throw new Error(`Journey "${journeyId}" is not submitted — cannot amend`)
  }
  record.submittedSnapshot = {
    fulfilment: clone(record.fulfilment),
    submittedAt: record.submittedAt
  }
  record.status = AMEND
  record.submittedAt = null
  return toJourney(record)
}

export const cancelAmend = async (journeyId) => {
  const record = read(journeyId)
  if (record.status !== AMEND || record.submittedSnapshot === undefined) {
    throw new Error(
      `Journey "${journeyId}" has no amendment snapshot — cannot cancel amendment`
    )
  }
  record.fulfilment = clone(record.submittedSnapshot.fulfilment)
  record.submittedAt = record.submittedSnapshot.submittedAt
  record.status = SUBMITTED
  delete record.submittedSnapshot
  return toJourney(record)
}

export const copy = async (journeyId, idempotencyKey) => {
  if (idempotencyKey == null || String(idempotencyKey).trim() === '') {
    throw new Error('Idempotency-Key must not be blank')
  }
  const existing = copiesByIdempotencyKey.get(idempotencyKey)
  if (existing !== undefined) return toJourney(read(existing))

  const source = read(journeyId)
  if (source.status !== SUBMITTED && source.status !== AMEND) {
    throw new Error(`Journey "${journeyId}" is ${source.status} — cannot copy`)
  }
  const copied = await create()
  const target = read(copied.journeyId)
  target.fulfilment = clone(source.fulfilment)
  for (const id of DOCUMENT_OBLIGATION_IDS) delete target.fulfilment[id]
  copiesByIdempotencyKey.set(idempotencyKey, target.journeyId)
  return toJourney(target)
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
  return toJourney(record)
}

export const clear = async () => {
  recordsById.clear()
  copiesByIdempotencyKey.clear()
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
