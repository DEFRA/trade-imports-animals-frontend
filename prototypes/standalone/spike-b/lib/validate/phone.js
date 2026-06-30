import Joi from 'joi'

/**
 * GDS-lenient telephone number schema.
 *
 * Follows the Design System guidance: accept the messy variety of phone
 * formats users actually submit rather than enforcing a strict regex. The
 * sanity checks are:
 *   - allow-list of characters (digits, spaces, `+`, `-`, `(`, `)`,
 *     `.,;` and the letters used in extension labels like `ext` and `x`);
 *   - the digit count, after stripping non-digits, must be between
 *     `minDigits` and `maxDigits` (defaults 7..15 — E.164 max is 15).
 *
 * Both invalid-format and digit-count failures share `formatMessage` because
 * the GDS hint exposes the accepted formats with one example string; users
 * don't need to distinguish "bad characters" from "wrong length".
 */
export const PHONE_ALLOWED = /^[0-9+()\-.,;\sextEXT]+$/
const PHONE_DEFAULT_MIN_DIGITS = 7
const PHONE_DEFAULT_MAX_DIGITS = 15

const countDigits = (value) => value.replace(/\D/g, '').length

const digitCountValidator = (minDigits, maxDigits) => (value, helpers) =>
  countDigits(value) < minDigits || countDigits(value) > maxDigits
    ? helpers.error('phone.length')
    : value

export function phoneSchema({
  name,
  enterMessage,
  formatMessage,
  required = true,
  minDigits = PHONE_DEFAULT_MIN_DIGITS,
  maxDigits = PHONE_DEFAULT_MAX_DIGITS
}) {
  // `.empty('')` collapses a typed-then-cleared input to undefined so the
  // store never carries an empty-string phone — keeps the rows() output and
  // the on-page error UX consistent in both required and optional modes.
  let field = Joi.string()
    .trim()
    .empty('')
    .pattern(PHONE_ALLOWED)
    .custom(digitCountValidator(minDigits, maxDigits), 'phone digit count')
    .messages({
      'string.pattern.base': formatMessage,
      'phone.length': formatMessage
    })
  if (required) {
    field = field.required().messages({
      'any.required': enterMessage,
      'string.pattern.base': formatMessage,
      'phone.length': formatMessage
    })
  }
  return Joi.object({ [name]: field }).unknown(true)
}
