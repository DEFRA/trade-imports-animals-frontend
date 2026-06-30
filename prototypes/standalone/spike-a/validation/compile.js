import Joi from 'joi'
import { stepById } from '../runtime/model.js'
import { evalCondition } from '../runtime/conditions.js'
import { humanize, regexFor, isEmpty } from '../runtime/util.js'

/**
 * Page-slice validation **derived from the model**, not hand-authored. For each
 * step we compile a Joi object schema from the declared field constraints
 * (type + required/min/max/pattern/options), validate the raw form payload, and
 * layer on the date triple and the within-page conditional requireds
 * (`requiredWhen`) that Joi can't express off the shape alone.
 *
 * Returns the same `{ ok, errors, errorSummary }` shape the existing prototype
 * controller used, so the shared section-page njk renders errors unchanged.
 */

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

const textSchema = (field) => {
  const regex = field.pattern ? regexFor(field.pattern) : undefined
  const schema = Joi.string().trim().empty('')
  return regex
    ? schema.pattern(regex).messages({
        'string.pattern.base': `Enter a valid ${humanize(field.id)}`
      })
    : schema
}

const schemaBuilders = {
  email: emailSchema,
  number: numberSchema,
  currency: currencySchema,
  boolean: booleanSchema,
  radio: radioSchema,
  'multi-select': multiSelectSchema
}

function baseForType(field) {
  const builder = schemaBuilders[field.type] ?? textSchema
  return builder(field)
}

function fieldToJoi(field) {
  let schema = baseForType(field)
  if (field.required) {
    schema = schema.required().messages({
      'any.required': `${humanize(field.id)} is required`,
      'string.empty': `${humanize(field.id)} is required`,
      'array.required': `${humanize(field.id)} is required`
    })
  }
  return schema
}

/** Derive a single Joi object schema for a step's non-date fields. */
function stepSchema(step) {
  const shape = {}
  for (const field of step.fields ?? []) {
    if (field.type !== 'date') {
      shape[field.id] = fieldToJoi(field)
    }
  }
  return Joi.object(shape).unknown(true)
}

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

function validateDateField(field, payload, addError) {
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

function makeErrorCollector() {
  const errors = {}
  const errorSummary = []
  const addError = (name, message) => {
    if (errors[name] === undefined) {
      errors[name] = message
      errorSummary.push({ text: message, href: `#${name}` })
    }
  }
  return { errors, errorSummary, addError }
}

function applySchemaErrors(step, payload, addError) {
  const { error } = stepSchema(step).validate(payload, { abortEarly: false })
  if (!error) {
    return
  }
  for (const detail of error.details) {
    addError(detail.path[0], detail.message)
  }
}

function applyConditionalRequired(field, payload, addError) {
  if (
    field.requiredWhen &&
    evalCondition(field.requiredWhen, payload) &&
    isEmpty(payload[field.id])
  ) {
    addError(field.id, `${humanize(field.id)} is required`)
  }
}

function applyExtraFieldErrors(step, payload, addError) {
  for (const field of step.fields) {
    if (field.type === 'date') {
      validateDateField(field, payload, addError)
    }
    applyConditionalRequired(field, payload, addError)
  }
}

export function validateStep(stepId, payload = {}) {
  const step = stepById.get(stepId)
  if (!step || !step.fields) {
    return { ok: true, value: payload }
  }
  const { errors, errorSummary, addError } = makeErrorCollector()
  applySchemaErrors(step, payload, addError)
  applyExtraFieldErrors(step, payload, addError)
  return errorSummary.length === 0
    ? { ok: true, value: payload }
    : { ok: false, errors, errorSummary }
}
