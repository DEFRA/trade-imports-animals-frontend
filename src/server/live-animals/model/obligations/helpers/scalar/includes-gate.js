/**
 * includesGate — "gate stored value is in [values] ? whenTrue : whenFalse".
 *
 * The one-liner for `transitedCountries`'s
 * `LAND_TRANSPORT_MODES.includes(fulfilments[meansOfTransport.id])`
 * predicate. Structurally analogous to `equalsGate` but with a set of
 * admitted values rather than a single scalar target.
 *
 * NOT to be confused with `allowListed` — `allowListed` filters over a
 * KEYED-RECORD storage shape and projects to instance-paths (depth-N
 * gates); `includesGate` reads the gate value as a scalar and returns
 * a scalar decision.
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
