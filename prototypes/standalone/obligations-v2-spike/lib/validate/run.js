/**
 * The one runner every controller calls. It takes a composed Joi schema and a
 * raw Hapi payload and returns `{ value, errors }` where `errors` is the exact
 * `{ fieldId: message }` map the v2 page seam already speaks — `kit.errorSummary`
 * turns it into the GDS summary (`a[href="#fieldId"]`) and each govuk macro,
 * given `errorMessage` + a matching `id`, emits the inline `#fieldId-error`.
 * So the Joi → GDS wiring reuses v2's existing seam rather than inventing one.
 *
 * `errors` is null when clean. First message wins per field (one inline error
 * per input), and unknown payload keys (crumb, sibling fields) pass through.
 */

const toFieldErrors = (details) =>
  details.reduce((errors, detail) => {
    const field = detail.path[0] ?? detail.context?.key
    if (field != null && errors[field] === undefined) {
      errors[field] = detail.message
    }
    return errors
  }, {})

export function validate(schema, payload) {
  const { value, error } = schema.validate(payload ?? {}, {
    abortEarly: false,
    convert: true
  })
  return { value, errors: error ? toFieldErrors(error.details) : null }
}
