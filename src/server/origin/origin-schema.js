import Joi from 'joi'

export const originSchema = Joi.object({
  countryCode: Joi.string().required().messages({
    'string.empty': 'Select the country where the animal originates from',
    'any.required': 'Select the country where the animal originates from'
  }),
  referenceNumber: Joi.string().optional().allow('', null),
  internalReference: Joi.string().optional().allow('', null),
  requiresRegionCode: Joi.string().optional().allow('', null),
  crumb: Joi.string().optional().allow('', null)
})
