/**
 * matches — equality check on an unindexed obligation. True where
 * `gateObligation`'s stored value equals `value`. Returns a single
 * `{ inScope }` decision.
 */
export const matches = (gateObligation, value) => {
  const fn = (fulfilments) =>
    fulfilments[gateObligation.id] === value
      ? { inScope: true }
      : { inScope: false }
  fn.metadata = { type: 'matches', obligation: gateObligation.id, value }
  return fn
}
