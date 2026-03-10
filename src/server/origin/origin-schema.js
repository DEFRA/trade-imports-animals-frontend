import Joi from 'joi'

export const originSchema = Joi.object({
  countryCode: Joi.string().required().messages({
    'string.empty': 'Select the country where the animal originates from',
    'any.required': 'Select the country where the animal originates from'
  }),
  internalReference: Joi.string().optional().allow('', null),
  requiresOriginCode: Joi.string().optional().allow('', null),
  crumb: Joi.string().optional().allow('', null)
})
