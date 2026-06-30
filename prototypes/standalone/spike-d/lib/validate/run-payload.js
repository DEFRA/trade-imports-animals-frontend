/**
 * Tiny validation runner shared by every prototype POST handler.
 *
 * `validatePayload(schema, payload)` returns either the coerced typed value
 * (numbers parsed from strings, unknown keys dropped) or a pair of error
 * structures shaped for the GOV.UK macros:
 *   - `errors`        { fieldName: 'First message' } — drives per-field errorMessage
 *   - `errorSummary`  [{ text, href }]               — drives govukErrorSummary
 *
 * For day/month/year date inputs the per-part error keys are joined with the
 * input's prefix (e.g. `dateOfBirth-day`), matching the macro's id convention.
 */

export const MAX_AGE = 120
export const MIN_DRIVING_AGE = 17

// Shape Joi's details into the two GOV.UK structures, keeping only the first
// message per field (the error summary should not repeat a field).
function buildFieldErrors(details) {
  const errors = {}
  const errorSummary = []
  for (const detail of details) {
    const name = detail.path[0]
    if (errors[name] === undefined) {
      errors[name] = detail.message
      errorSummary.push({ text: detail.message, href: `#${name}` })
    }
  }
  return { errors, errorSummary }
}

export function validatePayload(schema, payload) {
  if (!schema) {
    return { value: payload, errors: null, errorSummary: null }
  }
  // Unknown keys (other section fields, csrf crumb) pass through untouched —
  // the schemas opt in to `.unknown(true)`. We only coerce the keys each schema
  // names, leaving the rest as strings for `collect()` to read as today.
  const result = schema.validate(payload, {
    abortEarly: false,
    convert: true
  })
  if (!result.error) {
    return { value: result.value, errors: null, errorSummary: null }
  }
  const { errors, errorSummary } = buildFieldErrors(result.error.details)
  return { value: result.value, errors, errorSummary }
}
