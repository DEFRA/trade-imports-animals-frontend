import { applyDateRule, applyConditionalRequired } from './date-rules.js'
import { makeApplySchemaErrors } from './schemas.js'

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
  const applySchemaErrors = makeApplySchemaErrors(patterns)

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
