import { commoditySelection } from '../commodities/obligations.js'

/**
 * The commodity selections that put countyParishHoldingCph in scope. V4 lists
 * 19 commodities across five species families — cattle (0102), pigs (0103),
 * sheep (010410), goats (010420) and poultry/hatching-eggs (0105*, 0407*).
 * Equines (0101) are NOT on the CPH list. The gate keys on the exact
 * commoditySelection strings the commodities feature stores (COMMODITY_OPTIONS,
 * the V4 list entries verbatim), the same convention numberOfPackages and
 * containsUnweanedAnimals (inc-033) use. Of the current stubbed commodity
 * vocabulary only Cattle (0102) falls on the CPH list — Horse (0101) is
 * excluded, and pigs, sheep, goats and poultry have no commodity option yet,
 * so those 18 join this list when the MDM commodity list grows to carry them.
 */
export const CPH_COMMODITIES = ['0102 - Cattle']

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
    includes: CPH_COMMODITIES
  },
  wipeOnExit: true
}

export const obligations = [countyParishHoldingCph]
