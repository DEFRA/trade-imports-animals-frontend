import { validate } from '../../../../../../lib/validate/index.js'
import { REVEALS, fields, formValuesFromAnswers } from './controller.js'

// Rules key errors by form-field name (e.g. `transitDestinationCountry`), but
// the stored answer key is the reveal target (`destinationCountry`). Translate
// so downstream sees the answer key it recognises.
const rekeyToAnswers = (errors, reasonForImport) => {
  const revealMap = new Map(
    (REVEALS[reasonForImport] ?? []).map(({ field, answer }) => [field, answer])
  )
  return Object.fromEntries(
    Object.entries(errors).map(([key, value]) => [
      revealMap.get(key) ?? key,
      value
    ])
  )
}

export const validateStoredAnswers = async (answers) => {
  const payload = formValuesFromAnswers(answers)
  const { errors } = validate(await fields(answers.reasonForImport), payload)
  return rekeyToAnswers(errors ?? {}, answers.reasonForImport)
}
