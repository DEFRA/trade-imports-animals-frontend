import Joi from 'joi'
import { MAX_AGE, MIN_DRIVING_AGE, dateBoundsError } from './age.js'
import {
  MIN_DAY,
  MAX_DAY,
  MIN_MONTH,
  MAX_MONTH,
  MIN_YEAR,
  MAX_YEAR,
  realCalendarDate,
  capitalise
} from './realness.js'

/**
 * Required-mode DOB schema for a `${prefix}-day|-month|-year` triple: every part
 * must be present and numeric in its sensible range; the cross-field checks
 * (real calendar date, not in the future, age 17-120) hang off the `-day` key so
 * the message renders against the date input anchored at #${prefix}-day.
 */
export function requiredDobSchema(prefix, label) {
  const dayKey = `${prefix}-day`
  const monthKey = `${prefix}-month`
  const yearKey = `${prefix}-year`
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
    [dayKey]: part('day', MIN_DAY, MAX_DAY)
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
        if (!realCalendarDate(year, month, dayValue)) {
          return helpers.error('date.real')
        }
        const boundsError = dateBoundsError(
          new Date(year, month - 1, dayValue),
          new Date(),
          helpers
        )
        return boundsError ?? dayValue
      }, 'real DOB')
      .messages({
        'date.real': `${label} must be a real date`,
        'date.future': `${label} must be in the past`,
        'date.tooYoung': `You must be at least ${MIN_DRIVING_AGE} years old`,
        'date.tooOld': `Enter a ${label.toLowerCase()} less than ${MAX_AGE} years ago`
      }),
    [monthKey]: part('month', MIN_MONTH, MAX_MONTH),
    [yearKey]: Joi.number()
      .integer()
      .min(MIN_YEAR)
      .max(MAX_YEAR)
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
