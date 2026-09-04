import { present } from './present.js'

// presentGate — `whenTrue` if the gate has any stored answer,
// `whenFalse` otherwise. Uses `present`'s "answered" test: unindexed
// obligations count when their value is not null/undefined; indexed
// obligations count when at least one key exists.
export const presentGate = (gateObligation, whenTrue, whenFalse) => {
  const isPresent = present(gateObligation)
  const fn = (fulfilments) => (isPresent(fulfilments) ? whenTrue : whenFalse)
  fn.metadata = {
    type: 'presentGate',
    obligationId: gateObligation.id,
    whenTrue,
    whenFalse
  }
  return fn
}
