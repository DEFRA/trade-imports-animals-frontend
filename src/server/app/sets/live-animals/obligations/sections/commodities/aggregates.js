import {
  cphCommodities,
  unweanedCommodities
} from '../../../../../services/commodities/index.js'
import { anyAllowListed } from '../../../../../model/obligations/helpers/index.js'
import { commodityCode } from './lines.js'

const cphReason = {
  code: 'obligation.cph.applicable.becauseCphCommodity',
  explanation:
    'CPH applies when any commodity line has a CPH-required commodityCode'
}

// -----------------------------------------------------------------------------
// CPH — notification-level single, aggregated across commodity lines.
// -----------------------------------------------------------------------------

export const cph = {
  id: '263b4c5d-6e7f-4c93-8012-6cd3e4f50618',
  name: 'countyParishHoldingCph',
  applyTo: anyAllowListed(
    commodityCode,
    cphCommodities(),
    { inScope: true, status: 'mandatory', reasons: [cphReason] },
    { inScope: false }
  )
}

// -----------------------------------------------------------------------------
// Contains unweaned animals — notification-level yes/no, gated on the
// active commodities per V4. Only mandatory when the
// consignment includes at least one commodity requiring unweaned
// tracking (equines / cattle / pigs / sheep / goats). Declared here
// (rather than up top with
// the other notification-level scalar obligations) because the
// applyTo closure captures `commodityCode` — declaring it before
// commodityCode would trip the temporal dead zone.
// -----------------------------------------------------------------------------

const unweanedApplicableReason = {
  code: 'obligation.containsUnweanedAnimals.mandatory.becauseApplicableCommodity',
  explanation:
    'consignment includes at least one commodity that requires unweaned-animal tracking (equines, cattle, pigs, sheep, or goats)'
}

export const containsUnweanedAnimals = {
  id: '01a2b3c4-d5e6-4f07-8a89-0b1c2d3e4f5a',
  name: 'containsUnweanedAnimals',
  applyTo: anyAllowListed(
    commodityCode,
    unweanedCommodities(),
    { inScope: true, status: 'mandatory', reasons: [unweanedApplicableReason] },
    { inScope: false }
  )
}
