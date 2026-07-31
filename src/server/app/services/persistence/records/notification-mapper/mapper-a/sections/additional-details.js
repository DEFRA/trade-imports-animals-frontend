import {
  animalsCertifiedFor,
  containsUnweanedAnimals
} from '../../../../../../model/obligations/obligations.js'
import { compact, orUndefined } from '../../shared/compact.js'

export const additionalDetailsFromFulfilment = (reader) =>
  orUndefined(
    compact({
      certifiedFor: reader.scalar(animalsCertifiedFor),
      unweanedAnimals: reader.scalar(containsUnweanedAnimals)
    })
  )
