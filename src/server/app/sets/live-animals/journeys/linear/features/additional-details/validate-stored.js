import { validate } from '../../../../../../lib/validate/index.js'
import { fieldsFor, unweanedApplies } from './controller.js'

export const validateStoredAnswers = async (answers) => {
  const { errors } = validate(fieldsFor(unweanedApplies(answers)), {
    animalsCertifiedFor: answers.animalsCertifiedFor ?? '',
    containsUnweanedAnimals: answers.containsUnweanedAnimals ?? ''
  })
  return errors ?? {}
}
