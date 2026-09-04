// matches — `{ inScope: true }` when the gate's stored value equals
// `value`, `{ inScope: false }` otherwise. Simpler variant of
// `equalsGate` (no whenTrue/whenFalse decisions); kept for backwards
// compat.
export const matches = (gateObligation, value) => {
  const fn = (fulfilments) =>
    fulfilments[gateObligation.id] === value
      ? { inScope: true }
      : { inScope: false }
  fn.metadata = { gateType: 'matches', obligationId: gateObligation.id, value }
  return fn
}
