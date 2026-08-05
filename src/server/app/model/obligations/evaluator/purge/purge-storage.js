import { isKeyedRecord } from '../internal/is-keyed-record.js'

// applyTo returns the leaf fulfilmentIds it currently authorises; keep
// only stored records whose fulfilmentId is in that set. `{ keep: false }`
// when nothing survives the filter.
const purgedDerivedLeaf = (
  obligation,
  fulfilment,
  obligationApplicabilityDecisions
) => {
  const fulfilmentIds = new Set(
    obligationApplicabilityDecisions.get(obligation.id)?.records ?? []
  )
  const filtered = {}
  for (const [fulfilmentId, recordValue] of Object.entries(fulfilment ?? {})) {
    if (fulfilmentIds.has(fulfilmentId)) {
      filtered[fulfilmentId] = recordValue
    }
  }
  return Object.keys(filtered).length > 0
    ? { keep: true, value: filtered }
    : { keep: false }
}

// field record or user-leaf with a keyed map — drop only if it's empty.
const purgedKeyedRecord = (fulfilment) =>
  Object.keys(fulfilment).length > 0
    ? { keep: true, value: fulfilment }
    : { keep: false }

const purgedFulfilmentFor = (
  obligation,
  fulfilment,
  category,
  obligationApplicabilityDecisions
) => {
  if (category === 'derived-leaf') {
    return purgedDerivedLeaf(
      obligation,
      fulfilment,
      obligationApplicabilityDecisions
    )
  }
  if (category === 'single') {
    return { keep: true, value: fulfilment }
  }
  if (isKeyedRecord(fulfilment)) {
    return purgedKeyedRecord(fulfilment)
  }
  return { keep: true, value: fulfilment }
}

// Step 5: purge storage.
//   - Out-of-scope obligation → drop entire entry.
//   - Derived indexed leaf → keep only records whose fulfilmentId is in
//     the `applyTo`-returned set.
//   - Otherwise → keep as-is (ancestors already in scope, own storage
//     is self-valid for field records and user-driven indexed leaves).
export function purgeStorage(recognisedFulfilments, context) {
  const {
    obligationsById,
    obligationsByCategory,
    obligationApplicabilityDecisions,
    isInScope
  } = context

  const amendedFulfilments = {}
  for (const [obligationId, fulfilment] of Object.entries(
    recognisedFulfilments
  )) {
    const obligation = obligationsById.get(obligationId)
    if (!isInScope(obligation)) {
      continue
    }

    const category = obligationsByCategory.get(obligation.id)
    const purged = purgedFulfilmentFor(
      obligation,
      fulfilment,
      category,
      obligationApplicabilityDecisions
    )
    if (purged.keep) {
      amendedFulfilments[obligationId] = purged.value
    }
  }
  return amendedFulfilments
}
