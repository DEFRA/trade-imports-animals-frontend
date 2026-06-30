import { evalCondition } from '../conditions.js'
import { humanize, isEmpty } from '../fieldutil.js'

/**
 * Hand-rolled rules that sit alongside the derived Joi schema: day/month/year
 * realness for date fields and conditional-required for `requiredWhen` fields.
 */

const DATE_PARTS = ['day', 'month', 'year']

const validateDateField = (field, payload, addError) => {
  const parts = DATE_PARTS.map((part) => payload[`${field.id}-${part}`])
  const filled = parts.filter(
    (part) => part !== undefined && String(part).trim() !== ''
  ).length
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
  const [day, month, year] = parts.map(Number)
  const date = new Date(year, month - 1, day)
  const real =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  if (!real) {
    addError(`${field.id}-day`, `${humanize(field.id)} must be a real date`)
  }
}

export const applyDateRule = (field, payload, addError) => {
  if (field.type === 'date') {
    validateDateField(field, payload, addError)
  }
}

export const applyConditionalRequired = (field, payload, addError) => {
  if (
    field.requiredWhen &&
    evalCondition(field.requiredWhen, payload) &&
    isEmpty(payload[field.id])
  ) {
    addError(field.id, `${humanize(field.id)} is required`)
  }
}
