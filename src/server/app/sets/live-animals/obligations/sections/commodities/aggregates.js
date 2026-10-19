import {
  cphExemptCommodityCodes,
  unweanedCommodities
} from '../../../services/commodities/index.js'
import {
  anyAllowListed,
  anyNotInUnionOf
} from '../../../../../model/obligations/helpers/index.js'
import { commodityCode } from './lines.js'

const cphReason = {
  code: 'obligation.cph.applicable.becauseCphCommodity',
  explanation:
    'CPH applies when any commodity line has a commodityCode that is not CPH-exempt'
}

// -----------------------------------------------------------------------------
// CPH — notification-level single, aggregated across commodity lines. Asked
// unless every line's code is one of the exempt codes, so a code new to the
// picker is asked rather than let off.
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Contains unweaned animals — notification-level yes/no, gated on the
// commodities unweanedCommodities() names. Declared after commodityCode
// because the applyTo closure captures it.
// -----------------------------------------------------------------------------

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
    unweanedCommodities,
    { inScope: true, status: 'mandatory', reasons: [unweanedApplicableReason] },
    { inScope: false }
  )
}
