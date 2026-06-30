import Joi from 'joi'
import { humanize } from '../fieldutil.js'
import { SCHEMA_BUILDERS, patternedStringSchema } from './schema-builders.js'
import { applyCustomFieldErrors } from './custom-field-errors.js'

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
