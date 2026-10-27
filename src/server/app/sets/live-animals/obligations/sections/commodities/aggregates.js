import {
  cphExemptCommodityCodes,
  unweanedCommodityCodes
} from '../../../services/commodities/index.js'
import {
  anyAllowListed,
  anyNotInUnionOf
} from '../../../../../model/obligations/helpers/index.js'
import { commodityCode } from './lines.js'

const cphReason = {
  code: 'obligation.cph.applicable.becauseNotCphExempt',
  explanation:
    'CPH applies when any commodity line has a commodityCode that is not CPH-exempt'
}

export const cph = {
  id: '263b4c5d-6e7f-4c93-8012-6cd3e4f50618',
  name: 'countyParishHoldingCph',
  applyTo: anyNotInUnionOf(
    commodityCode,
    cphExemptCommodityCodes,
    { inScope: true, status: 'mandatory', reasons: [cphReason] },
    { inScope: false }
  )
}

const unweanedApplicableReason = {
  code: 'obligation.containsUnweanedAnimals.mandatory.becauseApplicableCommodity',
  explanation:
    'containsUnweanedAnimals applies when any commodity line has a commodityCode in the unweaned list'
}

export const containsUnweanedAnimals = {
  id: '01a2b3c4-d5e6-4f07-8a89-0b1c2d3e4f5a',
  name: 'containsUnweanedAnimals',
  applyTo: anyAllowListed(
    commodityCode,
    unweanedCommodityCodes,
    { inScope: true, status: 'mandatory', reasons: [unweanedApplicableReason] },
    { inScope: false }
  )
}
