import { validate } from '../../../../../../lib/validate/index.js'
import { fields, formValuesFromAnswers } from './controller.js'

export const validateStoredAnswers = async (answers) => {
  const payload = formValuesFromAnswers(answers)
  const { errors } = validate(
    await fields(answers.regionOfOriginCodeRequirement),
    payload
  )
  return errors ?? {}
}
