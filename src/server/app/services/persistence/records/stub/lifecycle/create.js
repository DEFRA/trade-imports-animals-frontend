import {
  DRAFT,
  AMEND,
  SUBMITTED
} from '../../../../../engine/persistence/records.js'
import { copiesBySourceAndKey, journeys } from '../store/state.js'
import { mintReferenceNumber } from '../reference-number.js'
import { marshal } from '../marshal/document.js'
import { hasReferenceParty } from './has-reference-party.js'

export const create = async () => {
  const document = {
    id: mintReferenceNumber(),
    status: DRAFT,
    createdAt: new Date().toISOString(),
    submittedAt: null,
    fulfilment: []
  }
  journeys.set(document.id, document)
  return structuredClone(marshal(document))
}

export const copy = async (journeyId, idempotencyKey, actor) => {
  const dedupeKey = `${journeyId}\u0000${idempotencyKey}`
  const existingCopyId = copiesBySourceAndKey.get(dedupeKey)
  if (existingCopyId) {
    return structuredClone(marshal(journeys.get(existingCopyId)))
  }

  const source = journeys.get(journeyId)
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
  // Copy on the real backend still returns 200 without the actor, but ships an
  // all-null party on the emitted event (draft-grade resolution). Mirror as a
  // hard fail on the stub so FIT catches the regression the real backend can't.
  if (hasReferenceParty(source.fulfilment) && !actor?.organisationId) {
    throw new Error('organisation id is required')
  }

  const document = {
    id: mintReferenceNumber(),
    status: DRAFT,
    createdAt: new Date().toISOString(),
    submittedAt: null,
    fulfilment: structuredClone(source.fulfilment)
  }
  journeys.set(document.id, document)
  copiesBySourceAndKey.set(dedupeKey, document.id)
  return structuredClone(marshal(document))
}
