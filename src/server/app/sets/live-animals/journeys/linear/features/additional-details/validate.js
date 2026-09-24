import {
  compose,
  oneOf,
  pageValidation
} from '../../../../../../lib/validate/index.js'
import * as certification from '../../../../../../services/certification-purposes/index.js'
import * as commodities from '../../../../services/commodities/index.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const copy = copyFor({ en, cy })

const asArray = (value) => [value ?? []].flat()

// Derived from answers, not scope: the stored reading has answers in hand
// but not scope. Same predicate the controller uses via `scope.has(...)`.
export const unweanedApplies = (answers) =>
  asArray(answers?.commodityLines).some((line) =>
    commodities.unweanedCommodities().includes(line?.commoditySelection)
  )

// One rule, two audiences: submit falls back to the generic `defaults.oneOf`;
// stored says the purpose has been retired since it was chosen. The unweaned
// rule takes no swap — its yes / no values are not a catalogue that changes.
const certifiedField = (stored) =>
  oneOf(
    'animalsCertifiedFor',
    certification.certificationPurposes().map((option) => option.value),
    stored ? copy.errors.certifiedNoLongerOffered : undefined
  )
const unweanedField = oneOf('containsUnweanedAnimals', ['yes', 'no'])

// Reveal derivation: POST gets `showUnweaned` from `scope.has(...)`; stored
// (CYA / hub) has no scope, so falls back to `unweanedApplies` over
// `storedAnswers`. Same answer either way.
const fields = (_values, { showUnweaned, storedAnswers, stored } = {}) => {
  const reveal = showUnweaned ?? unweanedApplies(storedAnswers)
  return reveal
    ? compose(certifiedField(stored), unweanedField)
    : compose(certifiedField(stored))
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
