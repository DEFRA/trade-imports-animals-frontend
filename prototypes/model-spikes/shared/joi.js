import Joi from 'joi'
import { evalCondition } from './conditions.js'
import { humanize, isEmpty } from './fieldutil.js'

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

  function baseForType(field) {
    switch (field.type) {
      case 'email':
        return Joi.string()
          .trim()
          .empty('')
          .email({ tlds: { allow: false } })
          .messages({ 'string.email': `Enter a valid ${humanize(field.id)}` })
      case 'number': {
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
      case 'currency':
        return Joi.number()
          .positive()
          .empty('')
          .messages({
            'number.base': `${humanize(field.id)} must be an amount`,
            'number.positive': `${humanize(field.id)} must be greater than 0`
          })
      case 'boolean':
        return Joi.string().valid('yes', 'no').empty('')
      case 'radio':
        return Joi.string()
          .valid(...(field.options ?? []).map((option) => option.value))
          .empty('')
      case 'multi-select':
        return Joi.array()
          .items(
            Joi.string().valid(...(field.options ?? []).map((o) => o.value))
          )
          .single()
          .empty('')
      default: {
        let schema = Joi.string().trim().empty('')
        const regex = field.pattern ? regexFor(field.pattern) : undefined
        if (regex) {
          schema = schema.pattern(regex).messages({
            'string.pattern.base': `Enter a valid ${humanize(field.id)}`
          })
        }
        return schema
      }
    }
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

  function stepSchema(fields) {
    const shape = {}
    for (const field of fields) {
      if (field.type !== 'date') {
        shape[field.id] = fieldToJoi(field)
      }
    }
    return Joi.object(shape).unknown(true)
  }

  function validateDateField(field, payload, addError) {
    const parts = ['day', 'month', 'year'].map(
      (p) => payload[`${field.id}-${p}`]
    )
    const filled = parts.filter(
      (part) => part !== undefined && String(part).trim() !== ''
    ).length
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
    const [d, m, y] = parts.map(Number)
    const date = new Date(y, m - 1, d)
    const real =
      date.getFullYear() === y &&
      date.getMonth() === m - 1 &&
      date.getDate() === d
    if (!real) {
      addError(`${field.id}-day`, `${humanize(field.id)} must be a real date`)
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

    const { error } = stepSchema(fields).validate(payload, {
      abortEarly: false
    })
    if (error) {
      for (const detail of error.details) {
        addError(detail.path[0], detail.message)
      }
    }

    for (const field of fields) {
      if (field.type === 'date') {
        validateDateField(field, payload, addError)
      }
      if (
        field.requiredWhen &&
        evalCondition(field.requiredWhen, payload) &&
        isEmpty(payload[field.id])
      ) {
        addError(field.id, `${humanize(field.id)} is required`)
      }
    }

    return errorSummary.length === 0
      ? { ok: true, value: payload }
      : { ok: false, errors, errorSummary }
  }
}
