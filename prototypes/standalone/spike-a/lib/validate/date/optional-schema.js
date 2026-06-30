import Joi from 'joi'
import {
  DAY_MIN,
  DAY_MAX,
  MONTH_MIN,
  MONTH_MAX,
  YEAR_MIN,
  YEAR_MAX,
  dateKeys
} from './constants.js'
import { trim } from './calendar.js'
import { checkDobConstraints, dobMessages } from './constraints.js'

const readParts = (rawDay, siblings, monthKey, yearKey) => ({
  day: trim(rawDay),
  month: trim(siblings[monthKey]),
  year: trim(siblings[yearKey])
})

const countFilled = (parts) => parts.filter((part) => part !== '').length

const allIntegers = (...numbers) =>
  numbers.every((value) => Number.isInteger(value))

const checkPartRanges = (dayNum, monthNum, yearNum, helpers) => {
  if (dayNum < DAY_MIN || dayNum > DAY_MAX) {
    return helpers.error('dob.dayRange')
  }
  if (monthNum < MONTH_MIN || monthNum > MONTH_MAX) {
    return helpers.error('dob.monthRange')
  }
  if (yearNum < YEAR_MIN || yearNum > YEAR_MAX) {
    return helpers.error('dob.yearRange')
  }
  return null
}

/**
 * Optional-mode DOB schema: a fully blank submission passes, so the field can
 * sit alongside other questions the user chooses to answer. If any of the three
 * boxes is filled, all three are required; the same calendar / age rules then
 * apply.
 *
 * All errors land on `-day` so the summary link points at the first box, and
 * the partials' per-part `govuk-input--error` logic highlights the day input.
 * The custom is the single source of truth for the DOB — it gates blank vs
 * partial vs full and coerces all three parts to Number on success.
 */
export function optionalDobSchema(prefix, label) {
  const { dayKey, monthKey, yearKey } = dateKeys(prefix)
  return Joi.object({
    [dayKey]: Joi.any()
      .custom((rawDay, helpers) => {
        const siblings = helpers.state.ancestors[0] ?? {}
        const { day, month, year } = readParts(
          rawDay,
          siblings,
          monthKey,
          yearKey
        )
        const filled = countFilled([day, month, year])
        if (filled === 0) {
          return undefined
        }
        if (filled < 3) {
          return helpers.error('dob.partial')
        }
        const dayNum = Number(day)
        const monthNum = Number(month)
        const yearNum = Number(year)
        if (!allIntegers(dayNum, monthNum, yearNum)) {
          return helpers.error('dob.partial')
        }
        return (
          checkPartRanges(dayNum, monthNum, yearNum, helpers) ??
          checkDobConstraints(yearNum, monthNum, dayNum, new Date(), helpers) ??
          dayNum
        )
      }, 'optional DOB')
      .messages({
        'dob.partial': `${label} must include a day, month and year`,
        'dob.dayRange': 'Day must be a number between 1 and 31',
        'dob.monthRange': 'Month must be a number between 1 and 12',
        'dob.yearRange': 'Year must be a real year',
        ...dobMessages(label)
      }),
    [monthKey]: Joi.any(),
    [yearKey]: Joi.any()
  }).unknown(true)
}
