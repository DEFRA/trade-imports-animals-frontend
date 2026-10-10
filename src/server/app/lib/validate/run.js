const MISSING_ANSWER_TYPES = new Set(['string.empty', 'any.required'])

const toFieldErrors = (details) =>
  details.reduce((errors, detail) => {
    const field = detail.path[0] ?? detail.context?.key
    return field != null && errors[field] === undefined
      ? { ...errors, [field]: detail.message }
      : errors
  }, {})

// A one-of rule reports a blank value as `any.only`, the same type it reports
// a value that is not on its list, so the blank is told by the value itself.
const isBlankChoice = (detail) =>
  detail.type === 'any.only' &&
  String(detail.context?.value ?? '').trim() === ''

const isMissingAnswer = (detail) =>
  MISSING_ANSWER_TYPES.has(detail.type) || isBlankChoice(detail)

const answeredDetails = (details, allowMissing) =>
  allowMissing ? details.filter((detail) => !isMissingAnswer(detail)) : details

/**
 * Run a schema over a submitted payload.
 *
 * @param {object} schema - A Joi schema.
 * @param {object} [payload] - The submitted values.
 * @param {object} [options]
 * @param {boolean} [options.allowMissing] - Leave a blank or absent answer unreported, still refusing one that breaks its own rule — the 'Save and return to overview' reading.
 * @returns {{ value: object, errors: object | null }}
 */
export const validate = (schema, payload, { allowMissing = false } = {}) => {
  const { value, error } = schema.validate(payload ?? {}, {
    abortEarly: false,
    convert: true
  })
  const errors = error
    ? toFieldErrors(answeredDetails(error.details, allowMissing))
    : {}
  return { value, errors: Object.keys(errors).length > 0 ? errors : null }
}
