import Joi from 'joi'

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
