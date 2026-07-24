const toFieldErrors = (details) =>
  details.reduce((errors, detail) => {
    const field = detail.path[0] ?? detail.context?.key
    return field != null && errors[field] === undefined
      ? { ...errors, [field]: detail.message }
      : errors
  }, {})

export const validate = (schema, payload) => {
  const { value, error } = schema.validate(payload ?? {}, {
    abortEarly: false,
    convert: true
  })
  return { value, errors: error ? toFieldErrors(error.details) : null }
}
