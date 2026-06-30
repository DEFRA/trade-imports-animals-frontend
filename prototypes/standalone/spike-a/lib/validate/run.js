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
// Shape Joi error details into the two GOV.UK structures: a first-message-wins
// per-field map and the matching summary array.
const toGovukErrors = (details) =>
  details.reduce(
    (acc, detail) => {
      const fieldName = detail.path[0]
      if (acc.errors[fieldName] !== undefined) {
        return acc
      }
      acc.errors[fieldName] = detail.message
      acc.errorSummary.push({ text: detail.message, href: `#${fieldName}` })
      return acc
    },
    { errors: {}, errorSummary: [] }
  )

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
  const { errors, errorSummary } = toGovukErrors(result.error.details)
  return { value: result.value, errors, errorSummary }
}
