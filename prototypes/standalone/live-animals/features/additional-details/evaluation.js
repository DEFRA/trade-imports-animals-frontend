import { feature, scalar } from '../../bridge/fulfilment-bindings.js'
import {
  animalsCertifiedFor,
  containsUnweanedAnimals
} from '../../model/obligations/obligations.js'

export const evaluationBindings = feature('additional-details', [
  scalar({
    field: 'containsUnweanedAnimals',
    obligation: containsUnweanedAnimals
  }),
  scalar({ field: 'animalsCertifiedFor', obligation: animalsCertifiedFor })
])
