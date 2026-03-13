import Joi from 'joi'

export const originSchema = Joi.object({
  countryCode: Joi.string().required().messages({
    'string.empty': 'Select the country where the animal originates from',
    'any.required': 'Select the country where the animal originates from'
  }),
  referenceNumber: Joi.string().optional().allow('', null),
  internalReference: Joi.string()
    .optional()
    .allow('', null)
    .pattern(/^[a-zA-Z0-9]*$/)
    .max(58)
    .messages({
      'string.pattern.base':
        'Internal reference must only contain letters and numbers',
      'string.max': 'Internal reference must be 58 characters or less'
    }),
  requiresRegionCode: Joi.string().optional().allow('', null),
  crumb: Joi.string().optional().allow('', null)
})
