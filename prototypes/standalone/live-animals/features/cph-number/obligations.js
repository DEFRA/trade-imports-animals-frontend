import { commoditySelection } from '../commodities/obligations.js'
import * as commodities from '../../services/commodities/index.js'

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
