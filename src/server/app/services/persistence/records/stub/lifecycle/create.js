import {
  DRAFT,
  AMEND,
  SUBMITTED
} from '../../../../../engine/persistence/records.js'
import { copiesBySourceAndKey, journeys } from '../store/state.js'
import { mintReferenceNumber } from '../reference-number.js'
import { marshal } from '../marshal/document.js'

export const create = async () => {
  const document = {
    id: mintReferenceNumber(),
    status: DRAFT,
    createdAt: new Date().toISOString(),
    submittedAt: null,
    fulfilment: []
  }
  journeys().set(document.id, document)
  return structuredClone(marshal(document))
}

export const copy = async (journeyId, idempotencyKey, _actor) => {
  const dedupeKey = `${journeyId}\u0000${idempotencyKey}`
  const inSet = journeys()
  const copies = copiesBySourceAndKey()
  const existingCopyId = copies.get(dedupeKey)
  if (existingCopyId) {
    return structuredClone(marshal(inSet.get(existingCopyId)))
  }

  const source = inSet.get(journeyId)
  if (!source) {
    throw new Error(`Unknown journey "${journeyId}"`)
  }
  if (
    source.status !== DRAFT &&
    source.status !== SUBMITTED &&
    source.status !== AMEND
  ) {
    throw new Error(`Journey "${journeyId}" is ${source.status} — cannot copy`)
  }
  const document = {
    id: mintReferenceNumber(),
    status: DRAFT,
    createdAt: new Date().toISOString(),
    submittedAt: null,
    fulfilment: structuredClone(source.fulfilment)
  }
  inSet.set(document.id, document)
  copies.set(dedupeKey, document.id)
  return structuredClone(marshal(document))
}
