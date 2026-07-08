import { reasonForImport } from '../import-reason/obligations.js'

export const purposeInInternalMarket = {
  id: 'purposeInInternalMarket',
  required: true,
  activatedBy: { obligation: reasonForImport, equals: 'internal-market' },
  wipeOnExit: true
}

export const obligations = [purposeInInternalMarket]
