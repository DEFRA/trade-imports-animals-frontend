import { present } from './present.js'

/**
 * presentGate — "gate has ANY answer ? whenTrue : whenFalse". The
 * closure body defers to the same "answered" test used by `present`:
 * scalar values other than `null`/`undefined` count as present; indexed
 * obligations count as present iff at least one key exists.
 *
 * Applies to `accompanyingDocumentType`'s self-referential status-swap
 * block (though the four accompanying-document siblings currently share
 * a `branchedGate` reading `documentTypePresent`). The four siblings can
 * either share a single `presentGate(accompanyingDocumentType,
 * {mandatory}, {optional})` or each site declares its own.
 *
 * @param {object} gateObligation — the obligation whose "answered" state gates.
 * @param {object} whenTrue — decision returned when gate is answered.
 * @param {object} whenFalse — decision returned when gate is unanswered.
 */
export const presentGate = (gateObligation, whenTrue, whenFalse) => {
  const isPresent = present(gateObligation)
  const fn = (fulfilments) => (isPresent(fulfilments) ? whenTrue : whenFalse)
  fn.metadata = {
    type: 'presentGate',
    obligation: gateObligation.id,
    whenTrue,
    whenFalse
  }
  return fn
}
