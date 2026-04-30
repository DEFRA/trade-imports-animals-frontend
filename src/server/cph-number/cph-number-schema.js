import Joi from 'joi'

export const cphNumberSchema = Joi.object({
  cphNumber: Joi.string().required().length(9).pattern(/^\d+$/).messages({
    'string.empty': 'Enter a CPH number',
    'any.required': 'Enter a CPH number',
    'string.length': 'CPH number must be exactly 9 digits',
    'string.pattern.base': 'CPH number must only contain numbers'
  }),
  crumb: Joi.string().optional().allow('', null)
})
