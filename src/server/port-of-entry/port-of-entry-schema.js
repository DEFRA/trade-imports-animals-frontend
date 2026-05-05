import Joi from 'joi'

const MIN_YEAR = 1000
const MAX_YEAR = 9999

const dateFieldNumber = (min, max, label) =>
  Joi.number()
    .integer()
    .min(min)
    .max(max)
    .empty('')
    .optional()
    .allow(null)
    .messages({ '*': `Enter a valid ${label}` })

export const portOfEntrySchema = Joi.object({
  portOfEntry: Joi.string().optional().allow('', null),
  'arrivalDate-day': dateFieldNumber(1, 31, 'day'),
  'arrivalDate-month': dateFieldNumber(1, 12, 'month'),
  'arrivalDate-year': dateFieldNumber(MIN_YEAR, MAX_YEAR, 'year'),
  crumb: Joi.string().optional().allow('', null)
})
