const toFieldErrors = (details) =>
  details.reduce((errors, detail) => {
    const field = detail.path[0] ?? detail.context?.key
    return field != null && errors[field] === undefined
      ? { ...errors, [field]: detail.message }
      : errors
  }, {})

/**
 * Run a schema over a submitted payload.
 *
 * @param {object} schema - A Joi schema.
 * @param {object} [payload] - The submitted values.
 * @returns {{ value: object, errors: object | null }}
 */
export const validate = (schema, payload) => {
  const { value, error } = schema.validate(payload ?? {}, {
    abortEarly: false,
    convert: true
  })
  const errors = error ? toFieldErrors(error.details) : {}
  return { value, errors: Object.keys(errors).length > 0 ? errors : null }
}
