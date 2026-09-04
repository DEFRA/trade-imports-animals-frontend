/**
 * includesGate — "gate stored value is in [values] ? whenTrue : whenFalse".
 *
 * The one-liner for `transitedCountries`'s
 * `LAND_TRANSPORT_MODES.includes(fulfilments[meansOfTransport.id])`
 * predicate. Structurally analogous to `equalsGate` but with a set of
 * admitted values rather than a single target.
 *
 * NOT to be confused with `allowListed` — `allowListed` filters over
 * an indexedFulfilments storage shape and projects to fulfilmentIndexes
 * (depth-N gates); `includesGate` reads the gate value as an unindexed
 * fulfilment and returns a single `{ inScope }` decision.
 *
 * @param {object} gateObligation — the obligation whose stored value is read.
 * @param {Array} values — the admitted list.
 * @param {object} whenTrue — decision returned on inclusion.
 * @param {object} whenFalse — decision returned on exclusion.
 */
export const includesGate = (gateObligation, values, whenTrue, whenFalse) => {
  const fn = (fulfilments) =>
    values.includes(fulfilments[gateObligation.id]) ? whenTrue : whenFalse
  fn.metadata = {
    type: 'includesGate',
    obligation: gateObligation.id,
    values,
    whenTrue,
    whenFalse
  }
  return fn
}
