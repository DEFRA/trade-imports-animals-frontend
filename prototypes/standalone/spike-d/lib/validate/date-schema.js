import Joi from 'joi'
import { MAX_AGE, MIN_DRIVING_AGE } from './run-payload.js'

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
    [dayKey]: part('day', 1, 31)
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
        const date = new Date(year, month - 1, dayValue)
        const realDate =
          date.getFullYear() === year &&
          date.getMonth() === month - 1 &&
          date.getDate() === dayValue
        if (!realDate) {
          return helpers.error('date.real')
        }
        const now = new Date()
        if (date.getTime() > now.getTime()) {
          return helpers.error('date.future')
        }
        const age = ageInYears(date, now)
        if (age < MIN_DRIVING_AGE) {
          return helpers.error('date.tooYoung')
        }
        if (age > MAX_AGE) {
          return helpers.error('date.tooOld')
        }
        return dayValue
      }, 'real DOB')
      .messages({
        'date.real': `${label} must be a real date`,
        'date.future': `${label} must be in the past`,
        'date.tooYoung': `You must be at least ${MIN_DRIVING_AGE} years old`,
        'date.tooOld': `Enter a ${label.toLowerCase()} less than ${MAX_AGE} years ago`
      }),
    [monthKey]: part('month', 1, 12),
    [yearKey]: Joi.number()
      .integer()
      .min(1000)
      .max(9999)
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

// All errors land on `-day` so the summary link points at the first box, and
// the partials' per-part `govuk-input--error` logic highlights the day input.
// The custom is the single source of truth for the DOB — it gates blank vs
// partial vs full and coerces all three parts to Number on success.
function optionalDobSchema(prefix, label) {
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
        const filled = [day, month, year].filter((part) => part !== '').length
        if (filled === 0) {
          return undefined
        }
        if (filled < 3) {
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
        if (dayNum < 1 || dayNum > 31) {
          return helpers.error('dob.dayRange')
        }
        if (monthNum < 1 || monthNum > 12) {
          return helpers.error('dob.monthRange')
        }
        if (yearNum < 1000 || yearNum > 9999) {
          return helpers.error('dob.yearRange')
        }
        const date = new Date(yearNum, monthNum - 1, dayNum)
        const realDate =
          date.getFullYear() === yearNum &&
          date.getMonth() === monthNum - 1 &&
          date.getDate() === dayNum
        if (!realDate) {
          return helpers.error('date.real')
        }
        const now = new Date()
        if (date.getTime() > now.getTime()) {
          return helpers.error('date.future')
        }
        const age = ageInYears(date, now)
        if (age < MIN_DRIVING_AGE) {
          return helpers.error('date.tooYoung')
        }
        if (age > MAX_AGE) {
          return helpers.error('date.tooOld')
        }
        return dayNum
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

function trim(value) {
  return String(value ?? '').trim()
}

function capitalise(str) {
  return str[0].toUpperCase() + str.slice(1)
}

function ageInYears(birth, now) {
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1
  }
  return age
}
