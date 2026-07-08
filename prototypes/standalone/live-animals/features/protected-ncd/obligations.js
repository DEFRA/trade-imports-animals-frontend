/**
 * `ncdYears` activates on the `addons` picker including 'protected-ncd'. The
 * addons feature (its collecting page and registered obligation) was removed
 * in inc-024, so this activator's source now lives here — the identity is
 * all the predicate reads (`answers.addons`). No page writes that answer any
 * more, so `ncdYears` can no longer enter scope in the running journey; the
 * whole protected-ncd feature goes in its own removal increment.
 */
const addons = { id: 'addons' }

const protectedNcdGate = { obligation: addons, includes: 'protected-ncd' }

export const ncdYears = {
  id: 'ncdYears',
  required: true,
  activatedBy: protectedNcdGate,
  wipeOnExit: true
}

export const obligations = [ncdYears]
