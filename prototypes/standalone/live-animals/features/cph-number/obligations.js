import { commoditySelection } from '../commodities/obligations.js'
import * as commodities from '../../services/commodities/index.js'

/**
 * Notification-level CPH number gated across every commodity line: shown when
 * ANY line's commoditySelection is one of the CPH commodities (frame:"anyItem",
 * the cross-frame-conditionality modelGap — the activator lives inside the
 * commodityLines items, not at top level). Leaving that scope wipes any saved
 * answer. Mandatory to submit; enforcedAt=submit so a blank save is not a
 * validation error (spec countyParishHoldingCph, c-007).
 */
export const countyParishHoldingCph = {
  id: 'countyParishHoldingCph',
  required: true,
  activatedBy: {
    obligation: commoditySelection,
    frame: 'anyItem',
    includes: commodities.cphCommodities()
  },
  wipeOnExit: true
}

export const obligations = [countyParishHoldingCph]
