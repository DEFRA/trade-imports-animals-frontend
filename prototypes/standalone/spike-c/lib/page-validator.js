import Joi from 'joi'
import { evalCondition } from './conditions.js'
import { humanize, isEmpty } from './fieldutil.js'

const DATE_PARTS = ['day', 'month', 'year']

const emailSchema = (field) =>
  Joi.string()
    .trim()
    .empty('')
    .email({ tlds: { allow: false } })
    .messages({ 'string.email': `Enter a valid ${humanize(field.id)}` })

const numberSchema = (field) => {
  let schema = Joi.number().integer().empty('')
  if (field.min !== undefined) {
    schema = schema.min(field.min)
  }
  if (field.max !== undefined) {
    schema = schema.max(field.max)
  }
  return schema.messages({
    'number.base': `${humanize(field.id)} must be a number`,
    'number.integer': `${humanize(field.id)} must be a whole number`,
    'number.min': `${humanize(field.id)} is out of range`,
    'number.max': `${humanize(field.id)} is out of range`
  })
}

const currencySchema = (field) =>
  Joi.number()
    .positive()
    .empty('')
    .messages({
      'number.base': `${humanize(field.id)} must be an amount`,
      'number.positive': `${humanize(field.id)} must be greater than 0`
    })

const booleanSchema = () => Joi.string().valid('yes', 'no').empty('')

const radioSchema = (field) =>
  Joi.string()
    .valid(...(field.options ?? []).map((option) => option.value))
    .empty('')

const multiSelectSchema = (field) =>
  Joi.array()
    .items(
      Joi.string().valid(...(field.options ?? []).map((option) => option.value))
    )
    .single()
    .empty('')

const patternedStringSchema = (field, regexFor) => {
  const base = Joi.string().trim().empty('')
  const regex = field.pattern ? regexFor(field.pattern) : undefined
  return regex
    ? base.pattern(regex).messages({
        'string.pattern.base': `Enter a valid ${humanize(field.id)}`
      })
    : base
}

const SCHEMA_BUILDERS = {
  email: emailSchema,
  number: numberSchema,
  currency: currencySchema,
  boolean: booleanSchema,
  radio: radioSchema,
  'multi-select': multiSelectSchema
}

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

// Date realness and conditional-required are applied in field order so the
// error summary keeps the same ordering as the page.
const applyCustomFieldErrors = (fields, payload, addError) =>
  fields.forEach((field) => {
    if (field.type === 'date') {
      validateDateField(field, payload, addError)
    }
    if (isConditionallyRequiredButEmpty(field, payload)) {
      addError(field.id, `${humanize(field.id)} is required`)
    }
  })

/**
 * Page-slice validation **derived from declared field constraints** — shared by
 * the spikes that derive Joi (A/B/C). The caller passes how to read a step's
 * fields and the named patterns; the constraints themselves are never
 * hand-authored here. Returns the `{ ok, errors, errorSummary }` shape the
 * shared section-page njk renders.
 *
 * A field spec is `{ id, type, required?, min?, max?, pattern?, options?,
 * requiredWhen? }`.
 */
export function makePageValidator({ getFields, patterns = {} }) {
  const regexFor = (name) =>
    patterns[name] ? new RegExp(patterns[name]) : undefined

  const baseForType = (field) => {
    const builder = SCHEMA_BUILDERS[field.type]
    return builder ? builder(field) : patternedStringSchema(field, regexFor)
  }

  const fieldToJoi = (field) => {
    const schema = baseForType(field)
    return field.required
      ? schema.required().messages({
          'any.required': `${humanize(field.id)} is required`,
          'string.empty': `${humanize(field.id)} is required`,
          'array.required': `${humanize(field.id)} is required`
        })
      : schema
  }

  const stepSchema = (fields) => {
    const shape = Object.fromEntries(
      fields
        .filter((field) => field.type !== 'date')
        .map((field) => [field.id, fieldToJoi(field)])
    )
    return Joi.object(shape).unknown(true)
  }

  const applySchemaErrors = (fields, payload, addError) => {
    const { error } = stepSchema(fields).validate(payload, {
      abortEarly: false
    })
    if (!error) {
      return
    }
    error.details.forEach((detail) => addError(detail.path[0], detail.message))
  }

  return function validateStep(stepId, payload = {}) {
    const fields = getFields(stepId)
    if (!fields.length) {
      return { ok: true, value: payload }
    }
    const errors = {}
    const errorSummary = []
    const addError = (name, message) => {
      if (errors[name] === undefined) {
        errors[name] = message
        errorSummary.push({ text: message, href: `#${name}` })
      }
    }

    applySchemaErrors(fields, payload, addError)
    applyCustomFieldErrors(fields, payload, addError)

    return errorSummary.length === 0
      ? { ok: true, value: payload }
      : { ok: false, errors, errorSummary }
  }
}
