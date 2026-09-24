import {
  compose,
  oneOf,
  pageValidation
} from '../../../../../../lib/validate/index.js'
import * as certification from '../../../../../../services/certification-purposes/index.js'
import * as commodities from '../../../../services/commodities/index.js'

const asArray = (value) => [value ?? []].flat()

// Same predicate the controller's GET / POST uses via `scope.has(...)`. Kept
// answers-derived so a stored reading (which has answers in hand but not scope)
// can decide the same way.
export const unweanedApplies = (answers) =>
  asArray(answers?.commodityLines).some((line) =>
    commodities.unweanedCommodities().includes(line?.commoditySelection)
  )

const certifiedField = oneOf(
  'animalsCertifiedFor',
  certification.certificationPurposes().map((option) => option.value)
)
const unweanedField = oneOf('containsUnweanedAnimals', ['yes', 'no'])

// The controller passes `showUnweaned` from `scope.has(...)` on POST; the
// stored path (CYA / hub) does not carry scope, so `unweanedApplies` derives
// the same predicate from the raw `storedAnswers` in context. Same reveal
// answer either way.
const fields = (_values, { showUnweaned, storedAnswers } = {}) => {
  const reveal = showUnweaned ?? unweanedApplies(storedAnswers)
  return reveal
    ? compose(certifiedField, unweanedField)
    : compose(certifiedField)
}

export const validation = pageValidation({
  fields,
  fromPayload: (payload) => ({
    animalsCertifiedFor: payload.animalsCertifiedFor ?? '',
    containsUnweanedAnimals: payload.containsUnweanedAnimals ?? ''
  }),
  fromAnswers: (answers) => ({
    animalsCertifiedFor: answers.animalsCertifiedFor ?? '',
    containsUnweanedAnimals: answers.containsUnweanedAnimals ?? ''
  })
})
