import Joi from 'joi'

export const portOfEntrySchema = Joi.object({
  portOfEntry: Joi.string().optional().allow('', null),
  'arrivalDate-day': Joi.number()
    .integer()
    .min(1)
    .max(31)
    .empty('')
    .optional()
    .allow(null)
    .messages({
      'number.base': 'Enter a valid day',
      'number.integer': 'Enter a valid day',
      'number.min': 'Enter a valid day',
      'number.max': 'Enter a valid day'
    }),
  'arrivalDate-month': Joi.number()
    .integer()
    .min(1)
    .max(12)
    .empty('')
    .optional()
    .allow(null)
    .messages({
      'number.base': 'Enter a valid month',
      'number.integer': 'Enter a valid month',
      'number.min': 'Enter a valid month',
      'number.max': 'Enter a valid month'
    }),
  'arrivalDate-year': Joi.number()
    .integer()
    .min(1000)
    .max(9999)
    .empty('')
    .optional()
    .allow(null)
    .messages({
      'number.base': 'Enter a valid year',
      'number.integer': 'Enter a valid year',
      'number.min': 'Enter a valid year',
      'number.max': 'Enter a valid year'
    }),
  crumb: Joi.string().optional().allow('', null)
})
