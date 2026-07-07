import { coverType } from '../cover-type/obligations.js'

export const premium = {
  id: 'premium',
  system: true,
  activatedBy: { obligation: coverType, present: true }
}

export const obligations = [premium]
