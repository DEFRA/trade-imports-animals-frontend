import Joi from 'joi'
import {
  MAX_AGE,
  MIN_DRIVING_AGE,
  MIN_DAY,
  MAX_DAY,
  MIN_MONTH,
  MAX_MONTH,
  MIN_YEAR,
  MAX_YEAR
} from './constants.js'
import { dobKeys, gdsDateError, capitalise } from './date-rules.js'
import { optionalDobSchema } from './optional-schema.js'

/**
 * GDS-canonical DOB schema for a `${prefix}-day|-month|-year` triple.
 *
 * Required mode (default): every part must be present and numeric in its
 * sensible range; the cross-field checks (real calendar date, not in the
 * future, age 17-120) hang off the `-day` key so the message renders against
 * the date input anchored at #${prefix}-day.
 *
 * Optional mode (`required: false`): a fully blank submission passes, so the
 * field can sit alongside other questions the user chooses to answer. If any
 * of the three boxes is filled, all three are required; the same calendar /
 * age rules then apply. All errors land on `${prefix}-day` so the error
 * summary links to the first box of the date input.
 *
 * @param {string} prefix the date input's namePrefix, e.g. 'dateOfBirth'
 * @param {string} label friendly label used in error messages, e.g. 'Date of birth'
 * @param {{ required?: boolean }} [options]
 */
export function dobSchema(prefix, label, { required = true } = {}) {
  if (!required) {
    return optionalDobSchema(prefix, label)
  }
  const { dayKey, monthKey, yearKey } = dobKeys(prefix)
  const partRange = (partName, min, max) =>
    `${capitalise(partName)} must be a number between ${min} and ${max}`
  const part = (partName, min, max) =>
    Joi.number()
      .integer()
      .min(min)
      .max(max)
      .required()
      .messages({
        'any.required': `${label} must include a ${partName}`,
        'number.base': `${label} must include a ${partName}`,
        'number.integer': partRange(partName, min, max),
        'number.min': partRange(partName, min, max),
        'number.max': partRange(partName, min, max)
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
        const code = gdsDateError(year, month, dayValue, new Date())
        return code ? helpers.error(code) : dayValue
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
