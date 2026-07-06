import { addons } from '../addons/obligations.js'

/**
 * Protected no-claims discount — the add-on detail obligation this feature
 * owns. Pure data; the only import is sideways, to the `addons` obligation
 * that activates this slice. SINGLE: spawn on selection, wipe on deselect.
 */
const protectedNcdGate = { obligation: addons, includes: 'protected-ncd' }

export const ncdYears = {
  id: 'ncdYears',
  required: true,
  activatedBy: protectedNcdGate,
  wipeOnExit: true
}

export const obligations = [ncdYears]
