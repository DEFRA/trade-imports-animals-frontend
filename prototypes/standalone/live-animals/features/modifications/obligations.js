import { addons } from '../addons/obligations.js'

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
