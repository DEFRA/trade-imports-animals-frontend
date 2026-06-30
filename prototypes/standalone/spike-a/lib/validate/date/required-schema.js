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
import { capitalise } from './calendar.js'
import { checkDobConstraints, dobMessages } from './constraints.js'

/**
 * GDS-canonical DOB schema for a `${prefix}-day|-month|-year` triple.
 *
 * Every part must be present and numeric in its sensible range; the cross-field
 * checks (real calendar date, not in the future, age 17-120) hang off the `-day`
 * key so the message renders against the date input anchored at #${prefix}-day.
 *
 * @param {string} prefix the date input's namePrefix, e.g. 'dateOfBirth'
 * @param {string} label friendly label used in error messages, e.g. 'Date of birth'
 */
export function requiredDobSchema(prefix, label) {
  const { dayKey, monthKey, yearKey } = dateKeys(prefix)
  const partRange = (kind, min, max) =>
    `${capitalise(kind)} must be a number between ${min} and ${max}`
  const part = (kind, min, max) =>
    Joi.number()
      .integer()
      .min(min)
      .max(max)
      .required()
      .messages({
        'any.required': `${label} must include a ${kind}`,
        'number.base': `${label} must include a ${kind}`,
        'number.integer': partRange(kind, min, max),
        'number.min': partRange(kind, min, max),
        'number.max': partRange(kind, min, max)
      })

  return Joi.object({
    [dayKey]: part('day', DAY_MIN, DAY_MAX)
      .custom((dayValue, helpers) => {
        const siblings = helpers.state.ancestors[0] ?? {}
        // Siblings may not have been validated yet when this custom runs, so
        // re-coerce them through Number(); the per-part validators handle
        // missing/non-integer values independently. If the coercion fails the
        // per-part validator will have raised — leave dayValue untouched.
        const month = Number(siblings[monthKey])
        const year = Number(siblings[yearKey])
        if (
          !Number.isInteger(dayValue) ||
          !Number.isInteger(month) ||
          !Number.isInteger(year)
        ) {
          return dayValue
        }
        return (
          checkDobConstraints(year, month, dayValue, new Date(), helpers) ??
          dayValue
        )
      }, 'real DOB')
      .messages(dobMessages(label)),
    [monthKey]: part('month', MONTH_MIN, MONTH_MAX),
    [yearKey]: Joi.number()
      .integer()
      .min(YEAR_MIN)
      .max(YEAR_MAX)
      .required()
      .messages({
        'any.required': `${label} must include a year`,
        'number.base': `${label} must include a year`,
        'number.integer': 'Year must be a real year',
        'number.min': 'Year must be a real year',
        'number.max': 'Year must be a real year'
      })
  }).unknown(true)
}
