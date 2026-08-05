import { obligationSet } from '../../../../../../model/obligations/manifest.js'
import { compact, orUndefined } from '../../shared/compact.js'

export const additionalDetailsFromFulfilment = (reader) => {
  const { animalsCertifiedFor, containsUnweanedAnimals } = obligationSet()
  return orUndefined(
    compact({
      certifiedFor: reader.scalar(animalsCertifiedFor),
      unweanedAnimals: reader.scalar(containsUnweanedAnimals)
    })
  )
}
