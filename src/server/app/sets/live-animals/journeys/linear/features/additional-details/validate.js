import {
  compose,
  oneOf,
  pageValidation
} from '../../../../../../lib/validate/index.js'
import * as certification from '../../../../../../services/certification-purposes/index.js'
import * as commodities from '../../../../services/commodities/index.js'

const asArray = (value) => [value ?? []].flat()

// Derived from answers, not scope: the stored reading has answers in hand
// but not scope. Same predicate the controller uses via `scope.has(...)`.
export const unweanedApplies = (answers) =>
  asArray(answers?.commodityLines).some((line) =>
    commodities.unweanedCommodities().includes(line?.commoditySelection)
  )

const certifiedField = oneOf(
  'animalsCertifiedFor',
  certification.certificationPurposes().map((option) => option.value)
)
const unweanedField = oneOf('containsUnweanedAnimals', ['yes', 'no'])

// Reveal derivation: POST gets `showUnweaned` from `scope.has(...)`; stored
// (CYA / hub) has no scope, so falls back to `unweanedApplies` over
// `storedAnswers`. Same answer either way.
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
