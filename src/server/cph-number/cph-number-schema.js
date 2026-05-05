import Joi from 'joi'

const CPH_NUMBER_LENGTH = 9

export const cphNumberSchema = Joi.object({
  cphNumber: Joi.string()
    .required()
    .length(CPH_NUMBER_LENGTH)
    .pattern(/^\d+$/)
    .messages({
      'string.empty': 'Enter a CPH number',
      'any.required': 'Enter a CPH number',
      'string.length': `CPH number must be exactly ${CPH_NUMBER_LENGTH} digits`,
      'string.pattern.base': 'CPH number must only contain numbers'
    }),
  crumb: Joi.string().optional().allow('', null)
})
