import { reasonForImport } from '../import-reason/obligations.js'

export const purposeInInternalMarket = {
  id: 'purposeInInternalMarket',
  required: true,
  activatedBy: { obligation: reasonForImport, equals: 'internalMarket' },
  wipeOnExit: true
}

export const obligations = [purposeInInternalMarket]
