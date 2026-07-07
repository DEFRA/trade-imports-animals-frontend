import { reasonForImport } from '../import-reason/obligations.js'

/**
 * Owed only when the import reason is the internal market; the stored
 * activator value is the kebab code, not the V4 label. Leaving that scope
 * wipes any saved purpose (spec: activatedBy + wipeOnExit).
 */
export const purposeInInternalMarket = {
  id: 'purposeInInternalMarket',
  required: true,
  activatedBy: { obligation: reasonForImport, equals: 'internal-market' },
  wipeOnExit: true
}

export const obligations = [purposeInInternalMarket]
