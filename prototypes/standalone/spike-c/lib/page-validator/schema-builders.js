import Joi from 'joi'
import { humanize } from '../fieldutil.js'

/**
 * Per-type Joi base-schema builders keyed by field `type`. `patternedStringSchema`
 * is the fallback for plain / patterned strings.
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

export const patternedStringSchema = (field, regexFor) => {
  const base = Joi.string().trim().empty('')
  const regex = field.pattern ? regexFor(field.pattern) : undefined
  return regex
    ? base.pattern(regex).messages({
        'string.pattern.base': `Enter a valid ${humanize(field.id)}`
      })
    : base
}

export const SCHEMA_BUILDERS = {
  email: emailSchema,
  number: numberSchema,
  currency: currencySchema,
  boolean: booleanSchema,
  radio: radioSchema,
  'multi-select': multiSelectSchema
}
