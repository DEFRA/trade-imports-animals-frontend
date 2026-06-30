import { evalCondition } from '../conditions.js'
import { humanize, isEmpty } from '../fieldutil.js'

/**
 * The non-Joi field checks: date realness (`${id}-day|-month|-year` triple) and
 * conditional-required. Applied in field order so the error summary keeps the
 * same ordering as the page.
 */

const DATE_PARTS = ['day', 'month', 'year']

const dateParts = (field, payload) =>
  DATE_PARTS.map((part) => payload[`${field.id}-${part}`])

const filledCount = (parts) =>
  parts.filter((part) => part !== undefined && String(part).trim() !== '')
    .length

const isRealDate = ([day, month, year]) => {
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

const validateDateField = (field, payload, addError) => {
  const parts = dateParts(field, payload)
  const filled = filledCount(parts)
  if (filled === 0) {
    if (field.required) {
      addError(`${field.id}-day`, `${humanize(field.id)} is required`)
    }
    return
  }
  if (filled < DATE_PARTS.length) {
    addError(`${field.id}-day`, `${humanize(field.id)} must be a real date`)
    return
  }
  if (!isRealDate(parts.map(Number))) {
    addError(`${field.id}-day`, `${humanize(field.id)} must be a real date`)
  }
}

const isConditionallyRequiredButEmpty = (field, payload) =>
  Boolean(field.requiredWhen) &&
  evalCondition(field.requiredWhen, payload) &&
  isEmpty(payload[field.id])

export const applyCustomFieldErrors = (fields, payload, addError) =>
  fields.forEach((field) => {
    if (field.type === 'date') {
      validateDateField(field, payload, addError)
    }
    if (isConditionallyRequiredButEmpty(field, payload)) {
      addError(field.id, `${humanize(field.id)} is required`)
    }
  })
