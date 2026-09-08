import { obligations } from '../../../model/obligations/manifest.js'
import { gateAdmits } from '../../applicability.js'

// Collection cap (MAX_ENTRIES) — group-level, no fulfilmentIndex.
export const collectionCapExceeded = (invariantErrors) =>
  invariantErrors.some((error) => error.code === 'MAX_ENTRIES')

// Per-parent count invariant (fulfilmentIndexCountEquals) — keyed by the PARENT
// record's fulfilment index (the commodity line), not this collection's
// own record fulfilment indexes, so it is checked here rather than per entry.
export const parentCountInvariantViolated = (
  invariantErrors,
  parentFulfilmentIndex
) =>
  parentFulfilmentIndex !== null &&
  invariantErrors.some(
    (error) => error.fulfilmentIndex === parentFulfilmentIndex
  )

// Whether any leaf of an `anyOfIds` rule could ever apply under this parent
// instance. A leaf with no gate always could; a gated leaf only where the
// parent's stored gate value is admitted. Mirrors the model's `checkAnyOfIds`,
// which skips an instance no listed leaf is in scope for — asked here before
// any instance exists, so it reads the gate metadata rather than the
// implications.
// Gate shapes this helper can actually read. Anything else — an equals/
// present/includes/branched gate, a depth-1 gate, or a gate fanned onto a
// different group — cannot be judged from metadata here, so the leaf is
// treated as one that could apply and the floor keeps biting. The permissive
// direction (reporting an empty collection satisfied) must never be reached
// by a shape we did not mean to admit.
const READABLE_GATE_TYPES = ['allowListed', 'notInUnionOf']

const anyOfLeafCouldApply = (group, parentFulfilmentIndex, state) =>
  (group.requires.anyOfIds ?? []).some((leafId) => {
    const metadata = obligations().find((candidate) => candidate.id === leafId)
      ?.applyTo?.metadata
    if (
      !metadata ||
      !READABLE_GATE_TYPES.includes(metadata.gateType) ||
      metadata.gatedParentGroupId !== group.id
    ) {
      return true
    }
    return gateAdmits(
      metadata,
      state.fulfilments?.[metadata.obligationId]?.[parentFulfilmentIndex]
    )
  })

// Empty collection: satisfied iff no requiredAtLeastOne floor bites. A floor
// that is only an `anyOfIds` rule is vacuous under a parent none of its leaves
// could apply to — a commodity line whose commodity carries no identifier of
// its own is asked for no animal records, rather than for records it could
// never fill in.
export const emptyCollectionSatisfiesFloor = (
  collection,
  group,
  parentFulfilmentIndex,
  state
) => {
  if (!collection.requiredAtLeastOne) {
    return true
  }
  if (group?.requires?.minEntries || parentFulfilmentIndex === null) {
    return false
  }
  return !anyOfLeafCouldApply(group, parentFulfilmentIndex, state)
}
