import Joi from 'joi'

const dateFieldNumber = (min, max, label) =>
  Joi.number()
    .integer()
    .min(min)
    .max(max)
    .empty('')
    .optional()
    .allow(null)
    .messages({
      'number.base': `Enter a valid ${label}`,
      'number.integer': `Enter a valid ${label}`,
      'number.min': `Enter a valid ${label}`,
      'number.max': `Enter a valid ${label}`
    })

export const portOfEntrySchema = Joi.object({
  portOfEntry: Joi.string().optional().allow('', null),
  'arrivalDate-day': dateFieldNumber(1, 31, 'day'),
  'arrivalDate-month': dateFieldNumber(1, 12, 'month'),
  'arrivalDate-year': dateFieldNumber(1000, 9999, 'year'),
  crumb: Joi.string().optional().allow('', null)
})
