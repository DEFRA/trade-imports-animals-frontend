import { commoditySelection } from '../commodities/obligations.js'

/**
 * The commodity selections that put containsUnweanedAnimals in scope. V4 lists
 * five commodity GROUPS — equines (0101), cattle (0102), pigs (0103), sheep
 * (010410) and goats (010420). The gate keys on the exact commoditySelection
 * strings the commodities feature stores (COMMODITY_OPTIONS, the V4 list
 * entries verbatim), the same convention numberOfPackages uses. Of the current
 * stubbed commodity vocabulary only Horse (0101) and Cattle (0102) fall inside
 * those groups; pigs, sheep and goats have no commodity option yet, so they
 * join this list when the MDM commodity list grows to carry them.
 */
export const UNWEANED_ANIMAL_COMMODITIES = ['0102 - Cattle', '0101 - Horse']

/**
 * Mandatory to submit; no activatedBy. APHA intend to make this conditional
 * for some commodities but that activation is unconfirmed (PO approval
 * pending, spec c-009), so it is modelled unconditional / always-in-scope
 * until a condition is ruled — the conservative shape (always owed) rather
 * than a guessed gate.
 */
export const animalsCertifiedFor = { id: 'animalsCertifiedFor', required: true }

/**
 * Notification-level flag gated across every commodity line: shown when ANY
 * line's commoditySelection is one of the unweaned-animal commodities
 * (frame:"anyItem", the cross-frame-conditionality modelGap — the activator
 * lives inside the commodityLines items, not at top level). Leaving that scope
 * wipes any saved answer.
 */
export const containsUnweanedAnimals = {
  id: 'containsUnweanedAnimals',
  required: true,
  activatedBy: {
    obligation: commoditySelection,
    frame: 'anyItem',
    includes: UNWEANED_ANIMAL_COMMODITIES
  },
  wipeOnExit: true
}

export const obligations = [animalsCertifiedFor, containsUnweanedAnimals]
