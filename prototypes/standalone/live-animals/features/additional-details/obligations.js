import { commoditySelection } from '../commodities/obligations.js'
import * as commodities from '../../services/commodities/index.js'

export const animalsCertifiedFor = { id: 'animalsCertifiedFor', required: true }

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
