import Joi from 'joi'
import { evalCondition } from './conditions.js'
import { humanize, isEmpty } from './fieldutil.js'

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

const applyDateRule = (field, payload, addError) => {
  if (field.type === 'date') {
    validateDateField(field, payload, addError)
  }
}

const applyConditionalRequired = (field, payload, addError) => {
  if (
    field.requiredWhen &&
    evalCondition(field.requiredWhen, payload) &&
    isEmpty(payload[field.id])
  ) {
    addError(field.id, `${humanize(field.id)} is required`)
  }
}

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
        Joi.string().valid(
          ...(field.options ?? []).map((option) => option.value)
        )
      )
      .single()
      .empty('')

  const stringSchema = (field) => {
    let schema = Joi.string().trim().empty('')
    const regex = field.pattern ? regexFor(field.pattern) : undefined
    if (regex) {
      schema = schema.pattern(regex).messages({
        'string.pattern.base': `Enter a valid ${humanize(field.id)}`
      })
    }
    return schema
  }

  const schemaBuildersByType = {
    email: emailSchema,
    number: numberSchema,
    currency: currencySchema,
    boolean: booleanSchema,
    radio: radioSchema,
    'multi-select': multiSelectSchema
  }

  const baseForType = (field) =>
    (schemaBuildersByType[field.type] ?? stringSchema)(field)

  const fieldToJoi = (field) => {
    const base = baseForType(field)
    if (field.required) {
      return base.required().messages({
        'any.required': `${humanize(field.id)} is required`,
        'string.empty': `${humanize(field.id)} is required`,
        'array.required': `${humanize(field.id)} is required`
      })
    }
    return base
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
    if (error) {
      for (const detail of error.details) {
        addError(detail.path[0], detail.message)
      }
    }
  }

  return function validateStep(stepId, payload = {}) {
    const fields = getFields(stepId)
    const errors = {}
    const errorSummary = []
    const addError = (name, message) => {
      if (errors[name] === undefined) {
        errors[name] = message
        errorSummary.push({ text: message, href: `#${name}` })
      }
    }
    if (!fields.length) {
      return { ok: true, value: payload }
    }

    applySchemaErrors(fields, payload, addError)

    for (const field of fields) {
      applyDateRule(field, payload, addError)
      applyConditionalRequired(field, payload, addError)
    }

    return errorSummary.length === 0
      ? { ok: true, value: payload }
      : { ok: false, errors, errorSummary }
  }
}
