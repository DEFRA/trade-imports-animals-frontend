import Joi from 'joi'
import { MAX_AGE, MIN_DRIVING_AGE, dateBoundsError } from './age.js'
import {
  DATE_PART_COUNT,
  realCalendarDate,
  countFilled,
  parsedDobParts,
  partRangeError,
  trim
} from './realness.js'

// All errors land on `-day` so the summary link points at the first box, and
// the partials' per-part `govuk-input--error` logic highlights the day input.
// The custom is the single source of truth for the DOB — it gates blank vs
// partial vs full and coerces all three parts to Number on success.
export function optionalDobSchema(prefix, label) {
  const dayKey = `${prefix}-day`
  const monthKey = `${prefix}-month`
  const yearKey = `${prefix}-year`
  return Joi.object({
    [dayKey]: Joi.any()
      .custom((rawDay, helpers) => {
        const siblings = helpers.state.ancestors[0] ?? {}
        const day = trim(rawDay)
        const month = trim(siblings[monthKey])
        const year = trim(siblings[yearKey])
        const filled = countFilled([day, month, year])
        if (filled === 0) {
          return undefined
        }
        if (filled < DATE_PART_COUNT) {
          return helpers.error('dob.partial')
        }
        const parts = parsedDobParts({ day, month, year })
        if (parts === null) {
          return helpers.error('dob.partial')
        }
        const { dayNum, monthNum, yearNum } = parts
        const rangeError = partRangeError(dayNum, monthNum, yearNum, helpers)
        if (rangeError) {
          return rangeError
        }
        if (!realCalendarDate(yearNum, monthNum, dayNum)) {
          return helpers.error('date.real')
        }
        const boundsError = dateBoundsError(
          new Date(yearNum, monthNum - 1, dayNum),
          new Date(),
          helpers
        )
        return boundsError ?? dayNum
      }, 'optional DOB')
      .messages({
        'dob.partial': `${label} must include a day, month and year`,
        'dob.dayRange': 'Day must be a number between 1 and 31',
        'dob.monthRange': 'Month must be a number between 1 and 12',
        'dob.yearRange': 'Year must be a real year',
        'date.real': `${label} must be a real date`,
        'date.future': `${label} must be in the past`,
        'date.tooYoung': `You must be at least ${MIN_DRIVING_AGE} years old`,
        'date.tooOld': `Enter a ${label.toLowerCase()} less than ${MAX_AGE} years ago`
      }),
    [monthKey]: Joi.any(),
    [yearKey]: Joi.any()
  }).unknown(true)
}
