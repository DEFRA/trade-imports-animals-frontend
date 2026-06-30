import { schema, validateValue, ifHolds } from '../validation/index.js'
import { humanize, isEmpty } from '../lib/fieldutil.js'
import { fieldType, stepFields } from './step-meta.js'

const OBJECT_TYPE = 'object'
const MULTI_SELECT = 'multi-select'

const coerceFieldValue = (field, payload) =>
  fieldType[field] === MULTI_SELECT
    ? [].concat(payload[field] ?? [])
    : payload[field]

const validateField = (field, payload, addError) => {
  const fieldSchema = schema.properties[field]
  if (!fieldSchema || fieldSchema.type === OBJECT_TYPE) {
    return
  }
  const value = coerceFieldValue(field, payload)
  if (schema.required.includes(field) && isEmpty(value)) {
    addError(field, `${humanize(field)} is required`)
    return
  }
  if (!isEmpty(value)) {
    const fieldErrors = validateValue(fieldSchema, value, field)
    if (fieldErrors.length) {
      addError(field, fieldErrors[0])
    }
  }
}

const applyConditionalBranch = (branch, fields, payload, addError) => {
  const conditionFields = Object.keys(branch.if.properties ?? {})
  if (!conditionFields.every((field) => fields.includes(field))) {
    return
  }
  if (!ifHolds(branch.if, payload)) {
    return
  }
  for (const requiredField of branch.then.required ?? []) {
    if (fields.includes(requiredField) && isEmpty(payload[requiredField])) {
      addError(requiredField, `${humanize(requiredField)} is required`)
    }
  }
}

const validateConditionalBranches = (fields, payload, addError) => {
  for (const branch of schema.allOf ?? []) {
    applyConditionalBranch(branch, fields, payload, addError)
  }
}

const buildResult = (payload, errors, errorSummary) =>
  errorSummary.length === 0
    ? { ok: true, value: payload }
    : { ok: false, errors, errorSummary }

// Page-slice: pick the step's fields, validate the raw payload, plus the
// within-page if/then (excessAmount required when voluntaryExcess = yes).
export function validateStep(stepId, payload = {}) {
  const fields = stepFields(stepId)
  const errors = {}
  const errorSummary = []
  const addError = (name, message) => {
    if (errors[name] === undefined) {
      errors[name] = message
      errorSummary.push({ text: message, href: `#${name}` })
    }
  }
  for (const field of fields) {
    validateField(field, payload, addError)
  }
  validateConditionalBranches(fields, payload, addError)
  return buildResult(payload, errors, errorSummary)
}
