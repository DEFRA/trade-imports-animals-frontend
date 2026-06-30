import { humanize } from '../../runtime/util.js'

function countFilledParts(field, payload) {
  return [`${field.id}-day`, `${field.id}-month`, `${field.id}-year`]
    .map((key) => payload[key])
    .filter((part) => part !== undefined && String(part).trim() !== '').length
}

function isRealDate(day, month, year) {
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

/** Layer the date-triple rules Joi can't express off the field shape alone. */
export function validateDateField(field, payload, addError) {
  const filled = countFilledParts(field, payload)
  if (filled === 0) {
    if (field.required) {
      addError(`${field.id}-day`, `${humanize(field.id)} is required`)
    }
    return
  }
  if (filled < 3) {
    addError(`${field.id}-day`, `${humanize(field.id)} must be a real date`)
    return
  }
  const dayNumber = Number(payload[`${field.id}-day`])
  const monthNumber = Number(payload[`${field.id}-month`])
  const yearNumber = Number(payload[`${field.id}-year`])
  if (!isRealDate(dayNumber, monthNumber, yearNumber)) {
    addError(`${field.id}-day`, `${humanize(field.id)} must be a real date`)
  }
}
