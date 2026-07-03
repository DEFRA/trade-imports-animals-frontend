import { addons } from '../addons/obligations.js'

/**
 * Named driver — the add-on detail obligations this feature owns. Pure data;
 * the only import is sideways, to the `addons` obligation that activates this
 * whole slice (a shared reference across features).
 *
 * SINGLE (not indexed): spawn on selection, wipe on deselect.
 */
const namedDriverGate = { obligation: addons, includes: 'named-driver' }

export const driverName = {
  id: 'driverName',
  required: true,
  activatedBy: namedDriverGate,
  wipeOnExit: true
}
export const driverDob = {
  id: 'driverDob',
  activatedBy: namedDriverGate,
  wipeOnExit: true
}
export const relationship = {
  id: 'relationship',
  required: true,
  activatedBy: namedDriverGate,
  wipeOnExit: true
}

export const defs = [driverName, driverDob, relationship]
