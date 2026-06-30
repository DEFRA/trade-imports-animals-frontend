import Joi from 'joi'
import { MAX_AGE, MIN_DRIVING_AGE } from './constants.js'
import {
  dobKeys,
  gdsDateError,
  dobFillState,
  partRangeError,
  trim
} from './date-rules.js'

// All errors land on `-day` so the summary link points at the first box, and
// the partials' per-part `govuk-input--error` logic highlights the day input.
// The custom is the single source of truth for the DOB — it gates blank vs
// partial vs full and coerces all three parts to Number on success.
export function optionalDobSchema(prefix, label) {
  const { dayKey, monthKey, yearKey } = dobKeys(prefix)
  return Joi.object({
    [dayKey]: Joi.any()
      .custom((rawDay, helpers) => {
        const siblings = helpers.state.ancestors[0] ?? {}
        const day = trim(rawDay)
        const month = trim(siblings[monthKey])
        const year = trim(siblings[yearKey])
        const fillState = dobFillState(day, month, year)
        if (fillState === 'blank') {
          return undefined
        }
        if (fillState === 'partial') {
          return helpers.error('dob.partial')
        }
        const dayNum = Number(day)
        const monthNum = Number(month)
        const yearNum = Number(year)
        if (
          !Number.isInteger(dayNum) ||
          !Number.isInteger(monthNum) ||
          !Number.isInteger(yearNum)
        ) {
          return helpers.error('dob.partial')
        }
        const rangeError = partRangeError(dayNum, monthNum, yearNum)
        if (rangeError) {
          return helpers.error(rangeError)
        }
        const code = gdsDateError(yearNum, monthNum, dayNum, new Date())
        return code ? helpers.error(code) : dayNum
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
