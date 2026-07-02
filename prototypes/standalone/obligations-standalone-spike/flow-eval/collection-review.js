/**
 * Spike-a's `claimsDone` analogue (parity ruling c). Pressing Continue on
 * a collection manage list stores the collection's (possibly empty)
 * fulfilments envelope — the REVIEWED marker. An in-scope mandatory
 * collection with zero rows then counts complete for Container statuses
 * and quote gating, while the engine's atLeastOne mandate still reports
 * it unfulfilled so the CYA POST blocks with 'Add at least one claim'
 * (Rulings item 3, the page-soft × engine-mandatory composition cell).
 *
 * The marker never survives a scope exit: wipeOutOfScope deletes the
 * whole envelope when the controlling answer flips, so a Yes–No–Yes
 * round trip re-enters Not Started (spike-a wipes claimsDone the same
 * way).
 */

/**
 * Is this obligation an empty-but-reviewed collection? True only when
 * the evaluation reports zero fulfilments AND the stored fulfilments map
 * carries the obligation's envelope key.
 */
export function isReviewedEmptyCollection(
  obligationId,
  obligation,
  fulfilments = {}
) {
  return (
    Array.isArray(obligation.fulfilments) &&
    obligation.fulfilments.length === 0 &&
    Object.hasOwn(fulfilments ?? {}, obligationId)
  )
}
