import { addons } from '../addons/obligations.js'

/**
 * Modifications — the add-on detail obligations this feature owns. Pure data;
 * the only import is sideways, to the `addons` obligation that activates this
 * slice. SINGLE: spawn on selection, wipe on deselect.
 */
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

export const defs = [modDescription, modValue]
