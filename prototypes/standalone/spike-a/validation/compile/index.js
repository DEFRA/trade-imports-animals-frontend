import { stepById } from '../../runtime/model.js'
import { evalCondition } from '../../runtime/conditions.js'
import { humanize, isEmpty } from '../../runtime/util.js'
import { stepSchema } from './field-schemas.js'
import { validateDateField } from './date-field.js'

/**
 * Page-slice validation **derived from the model**, not hand-authored. For each
 * step we compile a Joi object schema from the declared field constraints,
 * validate the raw form payload, and layer on the date triple and the
 * within-page conditional requireds (`requiredWhen`) that Joi can't express off
 * the shape alone.
 *
 * Returns the same `{ ok, errors, errorSummary }` shape the existing prototype
 * controller used, so the shared section-page njk renders errors unchanged.
 */

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
