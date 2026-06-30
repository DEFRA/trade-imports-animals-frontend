import Joi from 'joi'
import { humanize } from '../fieldutil.js'

/**
 * Per-field-type Joi schema builders derived from declared field constraints,
 * plus the step-schema runner. Bound to the journey's named regex `patterns`
 * via `makeApplySchemaErrors`, which returns the `applySchemaErrors` runner the
 * page validator drives.
 */

export function makeApplySchemaErrors(patterns = {}) {
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

  return (fields, payload, addError) => {
    const { error } = stepSchema(fields).validate(payload, {
      abortEarly: false
    })
    if (error) {
      for (const detail of error.details) {
        addError(detail.path[0], detail.message)
      }
    }
  }
}
