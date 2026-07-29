import {
  DRAFT,
  AMEND,
  SUBMITTED
} from '../../../../../engine/persistence/records.js'
import { byUser, copiesByOwnerAndKey, journeys } from '../store/state.js'
import { ownerKey, sameOwner } from '../store/owner.js'
import { mintReferenceNumber } from '../reference-number.js'
import { marshal } from '../marshal/document.js'

export const create = async ({ userId, owner } = {}) => {
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
}

export const copy = async (journeyId, owner, idempotencyKey) => {
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
    throw new Error(`Journey "${journeyId}" is ${source.status} — cannot copy`)
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
}
