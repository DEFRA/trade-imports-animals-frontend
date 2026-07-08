/**
 * `modDescription` and `modValue` activate on the `addons` picker including
 * 'modifications'. The addons feature (its collecting page and registered
 * obligation) was removed in inc-024, so this activator's source now lives
 * here — the identity is all the predicate reads (`answers.addons`). No page
 * writes that answer any more, so these obligations can no longer enter
 * scope in the running journey; the whole modifications feature goes in its
 * own removal increment.
 */
const addons = { id: 'addons' }

const modificationsGate = { obligation: addons, includes: 'modifications' }

export const modDescription = {
  id: 'modDescription',
  required: true,
  activatedBy: modificationsGate,
  wipeOnExit: true
}
export const modValue = {
  id: 'modValue',
  activatedBy: modificationsGate,
  wipeOnExit: true
}

export const obligations = [modDescription, modValue]
