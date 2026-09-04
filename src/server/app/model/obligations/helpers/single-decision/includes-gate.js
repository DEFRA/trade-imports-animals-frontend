// includesGate — `whenTrue` if the gate's stored value is in `values`,
// `whenFalse` otherwise. `equalsGate` with a set instead of a single
// target. Not to be confused with `allowListed`, which filters over
// indexedFulfilments and projects to fulfilmentIndexes.
export const includesGate = (gateObligation, values, whenTrue, whenFalse) => {
  const fn = (fulfilments) =>
    values.includes(fulfilments[gateObligation.id]) ? whenTrue : whenFalse
  fn.metadata = {
    gateType: 'includesGate',
    obligationId: gateObligation.id,
    values,
    whenTrue,
    whenFalse
  }
  return fn
}
