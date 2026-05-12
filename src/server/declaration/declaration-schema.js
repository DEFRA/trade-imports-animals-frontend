import Joi from 'joi'

export const declarationSchema = Joi.object({
  declaration: Joi.string().valid('confirmed').required().messages({
    'any.required':
      'Confirm that the information is true and correct before submitting',
    'any.only':
      'Confirm that the information is true and correct before submitting'
  }),
  crumb: Joi.string().optional().allow('', null)
})
