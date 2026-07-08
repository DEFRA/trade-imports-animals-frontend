import { commoditySelection } from '../commodities/obligations.js'
import * as commodities from '../../services/commodities/index.js'

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
    includes: commodities.unweanedCommodities()
  },
  wipeOnExit: true
}

export const obligations = [animalsCertifiedFor, containsUnweanedAnimals]
