import Joi from 'joi'

const arrivalDayErrMsg = 'Enter a valid day'
const arrivalMonthErrMsg = 'Enter a valid month'
const arrivalYearErrMsg = 'Enter a valid year'
const maxDays = 31
const maxYear = 9999
const maxMonth = 12

export const portOfEntrySchema = Joi.object({
  portOfEntry: Joi.string().optional().allow('', null),
  'arrivalDate-day': Joi.number()
    .integer()
    .min(1)
    .max(maxDays)
    .empty('')
    .optional()
    .allow(null)
    .messages({
      'number.base': arrivalDayErrMsg,
      'number.integer': arrivalDayErrMsg,
      'number.min': arrivalDayErrMsg,
      'number.max': arrivalDayErrMsg
    }),
  'arrivalDate-month': Joi.number()
    .integer()
    .min(1)
    .max(maxMonth)
    .empty('')
    .optional()
    .allow(null)
    .messages({
      'number.base': arrivalMonthErrMsg,
      'number.integer': arrivalMonthErrMsg,
      'number.min': arrivalMonthErrMsg,
      'number.max': arrivalMonthErrMsg
    }),
  'arrivalDate-year': Joi.number()
    .integer()
    .min(1000)
    .max(maxYear)
    .empty('')
    .optional()
    .allow(null)
    .messages({
      'number.base': arrivalYearErrMsg,
      'number.integer': arrivalYearErrMsg,
      'number.min': arrivalYearErrMsg,
      'number.max': arrivalYearErrMsg
    }),
  crumb: Joi.string().optional().allow('', null)
})
