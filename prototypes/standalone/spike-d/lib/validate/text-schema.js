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

const phoneDigitCountValidator = (minDigits, maxDigits) => (value, helpers) => {
  const digitCount = value.replace(/\D/g, '').length
  if (digitCount < minDigits || digitCount > maxDigits) {
    return helpers.error('phone.length')
  }
  return value
}

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
    .custom(phoneDigitCountValidator(minDigits, maxDigits), 'phone digit count')
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

/**
 * Required free-text schema for a single string field. Trims, rejects blank
 * with `enterMessage`. Used for fields like fullName where any non-empty value
 * is acceptable but the field can't be left empty at save.
 */
export function requiredTextSchema({ name, enterMessage }) {
  return Joi.object({
    [name]: Joi.string().trim().required().messages({
      'string.empty': enterMessage,
      'any.required': enterMessage
    })
  }).unknown(true)
}

/**
 * Email schema using Joi's built-in email validator.
 *
 * Required mode (default): blank is rejected with `enterMessage`; non-blank
 * must look like an email address (`formatMessage`). Optional mode mirrors
 * the other helpers — blank passes, non-blank is format-checked.
 */
export function emailSchema({
  name = 'email',
  enterMessage = 'Enter your email address',
  formatMessage = 'Enter an email address in the correct format, like name@example.com',
  required = true
} = {}) {
  const base = Joi.string()
    .trim()
    .email({ minDomainSegments: 2, tlds: { allow: false } })
  const schema = required
    ? base.required().messages({
        'string.empty': enterMessage,
        'any.required': enterMessage,
        'string.email': formatMessage
      })
    : base.allow('').optional().messages({
        'string.email': formatMessage
      })
  return Joi.object({ [name]: schema }).unknown(true)
}
