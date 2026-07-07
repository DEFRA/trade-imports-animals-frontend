import { addons } from '../addons/obligations.js'

const protectedNcdGate = { obligation: addons, includes: 'protected-ncd' }

export const ncdYears = {
  id: 'ncdYears',
  required: true,
  activatedBy: protectedNcdGate,
  wipeOnExit: true
}

export const obligations = [ncdYears]
