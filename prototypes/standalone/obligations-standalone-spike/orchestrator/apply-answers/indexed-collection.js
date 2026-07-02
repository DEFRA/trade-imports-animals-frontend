import { createIdentifierIndex } from '../../engine/identifiers.js'
import { mintFulfilmentId } from '../fulfilment-ids.js'
import { canonicalValue, writeSlotValue } from './canonical-value.js'

/**
 * The add/remove/reviewed lifecycle of user-source indexed fulfilments
 * (the claims loop, FULF-7..9). All three writers are pure on inputs and
 * key on obligation NAMES, translated once at this boundary.
 */

const userIndexedRecord = (identifiers, name) => {
  const record = identifiers.recordOfName(name)
  if (record.cardinality !== 'indexed' || record.indexedBy.source !== 'user') {
    throw new Error(
      `Obligation "${name}" is not a user-source indexed obligation`
    )
  }
  return record
}

/**
 * Add one row across the named user-source indexed obligations, minting
 * ONE shared id (a claim indexes both claimType and claimAmount). Values
 * arrive keyed by obligation name; unanswered obligations store blank —
 * spike-a counts a typeless claim.
 */
export function addFulfilment(obligations, fulfilments, names, values = {}) {
  const identifiers = createIdentifierIndex(obligations)
  const next = structuredClone(fulfilments ?? {})
  const fulfilmentId = mintFulfilmentId()
  for (const name of names) {
    const record = userIndexedRecord(identifiers, name)
    const value = canonicalValue(record, name, values) ?? ''
    writeSlotValue(next, record, fulfilmentId, value)
  }
  return { fulfilments: next, fulfilmentId }
}

/**
 * Mark the named user-source indexed collections REVIEWED by ensuring
 * their (possibly empty) fulfilments envelopes exist — spike-a's
 * claimsDone analogue (parity ruling c). Continue on an empty manage
 * list then counts complete on the hub while the atLeastOne mandate
 * still blocks the CYA POST. Idempotent; rows already stored are kept.
 */
export function markCollectionReviewed(obligations, fulfilments, names) {
  const identifiers = createIdentifierIndex(obligations)
  const next = structuredClone(fulfilments ?? {})
  for (const name of names) {
    const record = userIndexedRecord(identifiers, name)
    next[record.id] ??= {}
  }
  return next
}

/** Remove one row (by shared id) from the named indexed obligations.
 * Removing the last row deletes the envelope too, so the collection
 * reads Not Started again — only markCollectionReviewed (the Continue
 * press) leaves the reviewed-empty marker behind. */
export function removeFulfilment(
  obligations,
  fulfilments,
  names,
  fulfilmentId
) {
  const identifiers = createIdentifierIndex(obligations)
  const next = structuredClone(fulfilments ?? {})
  for (const name of names) {
    const record = userIndexedRecord(identifiers, name)
    delete next[record.id]?.[fulfilmentId]
    if (next[record.id] && Object.keys(next[record.id]).length === 0) {
      delete next[record.id]
    }
  }
  return next
}
