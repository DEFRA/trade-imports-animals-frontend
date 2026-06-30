import Joi from 'joi'
import { humanize, regexFor } from '../../runtime/util.js'

/**
 * Per-type Joi schema builders derived from a field's declared constraints
 * (type + required/min/max/pattern/options). `stepSchema` composes a single
 * object schema for a step's non-date fields.
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
export function stepSchema(step) {
  const shape = {}
  for (const field of step.fields ?? []) {
    if (field.type !== 'date') {
      shape[field.id] = fieldToJoi(field)
    }
  }
  return Joi.object(shape).unknown(true)
}
