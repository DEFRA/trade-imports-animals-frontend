import { WITNESS_KIND } from './kinds.js'

// A witness from an allowlist-shaped `meta.values` array: the first entry,
// or opaque when the array is missing/empty. `withGatedParentGroupId`
// controls whether the returned witness carries the id key at all (some
// callers never included one).
export const firstListedValueWitness = (
  meta,
  emptyReason,
  { withGatedParentGroupId } = {}
) => {
  if (!Array.isArray(meta.values) || meta.values.length === 0) {
    return { kind: WITNESS_KIND.OPAQUE, reason: emptyReason }
  }
  const witness = {
    kind: WITNESS_KIND.WITNESS,
    obligationId: meta.obligationId,
    value: meta.values[0]
  }
  return withGatedParentGroupId
    ? { ...witness, gatedParentGroupId: meta.gatedParentGroupId ?? null }
    : witness
}

export const isTotalBranchGate = (meta) =>
  meta.whenTrue?.inScope === true && meta.whenFalse?.inScope === true

// Meta-first gate helpers (equalsGate/presentGate/includesGate) share the
// same total-branches-are-trivial guard ahead of their own witness shape.
export const totalBranchWitnessOrValue = (meta, makeWitness) =>
  isTotalBranchGate(meta) ? { kind: WITNESS_KIND.TRIVIAL } : makeWitness()
