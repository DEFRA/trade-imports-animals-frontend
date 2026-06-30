import Joi from 'joi'
import { MAX_AGE, MIN_DRIVING_AGE } from './run-payload.js'

const MIN_DAY = 1
const MAX_DAY = 31
const MIN_MONTH = 1
const MAX_MONTH = 12
const MIN_YEAR = 1000
const MAX_YEAR = 9999

const isRealDate = (day, month, year) => {
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

// Shared realness + future + age-bounds check; raises the same four error codes
// from both required and optional DOB modes. Returns the numeric day on success.
const checkCalendarAndAge = (day, month, year, helpers) => {
  if (!isRealDate(day, month, year)) {
    return helpers.error('date.real')
  }
  const date = new Date(year, month - 1, day)
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
  return day
}

const countFilledParts = (day, month, year) =>
  [day, month, year].filter((part) => part !== '').length

const parseParts = (day, month, year) => ({
  dayNum: Number(day),
  monthNum: Number(month),
  yearNum: Number(year)
})

const checkPartRanges = (day, month, year, helpers) => {
  if (day < MIN_DAY || day > MAX_DAY) {
    return helpers.error('dob.dayRange')
  }
  if (month < MIN_MONTH || month > MAX_MONTH) {
    return helpers.error('dob.monthRange')
  }
  if (year < MIN_YEAR || year > MAX_YEAR) {
    return helpers.error('dob.yearRange')
  }
  return undefined
}

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
        return checkCalendarAndAge(dayValue, month, year, helpers)
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
        const filled = countFilledParts(day, month, year)
        if (filled === 0) {
          return undefined
        }
        if (filled < 3) {
          return helpers.error('dob.partial')
        }
        const { dayNum, monthNum, yearNum } = parseParts(day, month, year)
        if (![dayNum, monthNum, yearNum].every(Number.isInteger)) {
          return helpers.error('dob.partial')
        }
        const rangeError = checkPartRanges(dayNum, monthNum, yearNum, helpers)
        if (rangeError) {
          return rangeError
        }
        return checkCalendarAndAge(dayNum, monthNum, yearNum, helpers)
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
