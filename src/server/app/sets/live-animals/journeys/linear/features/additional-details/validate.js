import {
  compose,
  oneOf,
  pageValidation
} from '../../../../../../lib/validate/index.js'
import * as certification from '../../../../../../services/certification-purposes/index.js'
import { unweanedApplies } from '../check-answers/view-model/applicability.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const copy = copyFor({ en, cy })

const certifiedField = (stored) =>
  oneOf(
    'animalsCertifiedFor',
    certification.certificationPurposes().map((option) => option.value),
    stored ? copy.errors.certifiedNoLongerOffered : undefined
  )
const unweanedField = oneOf('containsUnweanedAnimals', ['yes', 'no'])

const fields = (_values, { showUnweaned, storedAnswers, stored } = {}) => {
  const reveal = showUnweaned ?? unweanedApplies(storedAnswers ?? {})
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
