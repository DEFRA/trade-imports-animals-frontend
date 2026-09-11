const SINGLE_ENTRY = 1

/**
 * moreThanOne — narrows another gate to the case where it admits more
 * than one entry.
 *
 * Design release 1 asks for animal identification only where a
 * consignment carries more than one identified commodity line — a line
 * whose commodity has an identifier set of its own. The gate reads the
 * commodity selection, not the species selection, so two lines of the
 * same species count as two. The inner gate
 * names the entries that would be asked; this wrapper stands the whole
 * rule down unless there are at least two of them, and otherwise hands
 * back the inner decision untouched so the caller reads the same
 * `fulfilmentIndexes`.
 *
 * Unindexed decisions (`{ inScope: true }` with no fulfilmentIndexes)
 * name one verdict, not several, so they never satisfy "more than one".
 *
 * Combinator, not a gate of its own. It belongs on a group's
 * `requires` — `floorAppliesToParent` is its only use today — and never
 * on an obligation's `applyTo`, so the metadata carries `combinator`
 * rather than `gateType`: the reachability prover's witness synthesiser
 * inverts single-value gates, and "more than one entry passed" is not a
 * value it can name. `.metadata.inner` carries the wrapped gate's own
 * metadata for static inspection.
 *
 * @param {(fulfilments: object, fulfilmentIndexesByObligationId: Map) => object} gate
 *   the gate to narrow.
 * @returns {(fulfilments: object, fulfilmentIndexesByObligationId: Map) => object}
 */
export const moreThanOne = (gate) => {
  const fn = (fulfilments, fulfilmentIndexesByObligationId) => {
    const decision = gate(fulfilments, fulfilmentIndexesByObligationId)
    const admitted = decision?.inScope
      ? (decision.fulfilmentIndexes ?? []).length
      : 0
    return admitted > SINGLE_ENTRY ? decision : { inScope: false }
  }
  fn.metadata = {
    combinator: 'moreThanOne',
    inner: gate?.metadata ?? null
  }
  return fn
}
