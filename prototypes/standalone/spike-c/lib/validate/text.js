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
