/**
 * THE Yes-No-Yes parity mechanism (SHAPE-18/19, INDEX-19..21, FULF-11/12):
 * when an obligation leaves scope its stored data is actively DELETED —
 * gone, not hidden — so re-entering scope starts blank and can never
 * rehydrate (obligations.md:199, 509-522). Two pure reconciliations:
 *
 * - `wipeOutOfScope` deletes every stored entry whose obligation the
 *   evaluation reports out of scope, returning the wipes as data.
 * - `reconcileDerived` keeps each derived indexed obligation's fulfilment
 *   keys in lockstep with its controller's current answer: spawn a blank
 *   fulfilment when the controlling value is selected (the key IS the
 *   controlling value — FULF-18 pattern 2, provisional), drop-and-wipe
 *   when it is deselected, and a later re-select spawns FRESH blank.
 *
 * Both run inside the orchestrator's fixed-point pass; both are pure on
 * inputs and idempotent.
 */

/**
 * wipeOutOfScope(obligationState, fulfilments) -> { fulfilments, wiped }.
 * `obligationState` is the id-keyed EvaluationResult obligations map.
 */
export function wipeOutOfScope(obligationState, fulfilments = {}) {
  const next = structuredClone(fulfilments)
  const wiped = []
  for (const obligationId of Object.keys(next)) {
    const state = obligationState[obligationId]
    if (state && !state.inScope) {
      delete next[obligationId]
      wiped.push({ obligationId, name: state.name })
    }
  }
  return { fulfilments: next, wiped }
}

const isSelected = (controllerValue, controllingValue) =>
  Array.isArray(controllerValue)
    ? controllerValue.includes(controllingValue)
    : controllerValue === controllingValue

const reconcileRecord = (record, next, spawned, dropped) => {
  const { controllingObligation, controllingValue } = record.indexedBy
  const selected = isSelected(
    next[controllingObligation]?.value,
    controllingValue
  )
  const entry = next[record.id] ?? {}

  for (const fulfilmentId of Object.keys(entry)) {
    const stale = fulfilmentId !== controllingValue || !selected
    if (stale) {
      delete entry[fulfilmentId]
      dropped.push({ obligationId: record.id, name: record.name, fulfilmentId })
    }
  }
  if (selected && !Object.hasOwn(entry, controllingValue)) {
    entry[controllingValue] = { value: '' }
    spawned.push({
      obligationId: record.id,
      name: record.name,
      fulfilmentId: controllingValue
    })
  }

  if (Object.keys(entry).length === 0) {
    delete next[record.id]
  } else {
    next[record.id] = entry
  }
}

/**
 * reconcileDerived(obligations, fulfilments) ->
 * { fulfilments, spawned, dropped }. Only records with
 * `indexedBy.source === 'derived'` are touched.
 */
export function reconcileDerived(obligations, fulfilments = {}) {
  const next = structuredClone(fulfilments)
  const spawned = []
  const dropped = []
  for (const record of obligations) {
    if (record.indexedBy?.source === 'derived') {
      reconcileRecord(record, next, spawned, dropped)
    }
  }
  return { fulfilments: next, spawned, dropped }
}
