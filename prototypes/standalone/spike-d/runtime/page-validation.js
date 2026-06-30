import { schema, validateValue, ifHolds } from '../validation/index.js'
import { humanize, isEmpty } from '../lib/fieldutil.js'
import { fieldType, stepFields } from './step-meta.js'

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
    const node = schema.properties[field]
    if (!node || node.type === 'object') {
      continue
    }
    const value =
      fieldType[field] === 'multi-select'
        ? [].concat(payload[field] ?? [])
        : payload[field]
    if (schema.required.includes(field) && isEmpty(value)) {
      addError(field, `${humanize(field)} is required`)
    } else if (!isEmpty(value)) {
      const errs = validateValue(node, value, field)
      if (errs.length) {
        addError(field, errs[0])
      }
    }
  }
  for (const branch of schema.allOf ?? []) {
    const condFields = Object.keys(branch.if.properties ?? {})
    if (!condFields.every((field) => fields.includes(field))) {
      continue
    }
    if (ifHolds(branch.if, payload)) {
      for (const req of branch.then.required ?? []) {
        if (fields.includes(req) && isEmpty(payload[req])) {
          addError(req, `${humanize(req)} is required`)
        }
      }
    }
  }
  return errorSummary.length === 0
    ? { ok: true, value: payload }
    : { ok: false, errors, errorSummary }
}
