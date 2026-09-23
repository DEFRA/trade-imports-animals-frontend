import { validate } from '../../../../../../../lib/validate/index.js'
import { fields } from './port-of-entry.controller.js'
import { arrivalWindow } from './arrival-window.js'

// The date field is stored as {day, month, year} (from kit.readDate at
// POST time) but the validator reads a single dd/mm/yyyy string. A stored
// non-string that doesn't split into a date object round-trips as itself
// so dateTextInRange can raise INVALID_ERROR_CODE the same way it does
// on live input.
const dateObjectToString = (value) => {
  if (typeof value === 'string') {
    return value
  }
  if (!value) {
    return ''
  }
  const { day = '', month = '', year = '' } = value
  if (day === '' && month === '' && year === '') {
    return ''
  }
  return `${day}/${month}/${year}`
}

const payloadFromAnswers = (answers) => ({
  arrivalDateAtPort: dateObjectToString(answers.arrivalDateAtPort),
  portOfEntry: answers.portOfEntry ?? '',
  meansOfTransport: answers.meansOfTransport ?? '',
  transportIdentification: answers.transportIdentification ?? '',
  transportDocumentReference: answers.transportDocumentReference ?? ''
})

export const validateStoredAnswers = async (answers) => {
  const payload = payloadFromAnswers(answers)
  const { errors } = validate(await fields(arrivalWindow()), payload)
  return errors ?? {}
}
