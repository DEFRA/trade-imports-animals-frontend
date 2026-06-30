import Joi from 'joi'

/**
 * Date-of-birth schema family. `dobSchema` is the factory used by sections.js /
 * addons.js so the DOB field's canonical rules are declared once and composed
 * with `Joi.object().concat(...)`.
 */

export const MAX_AGE = 120
export const MIN_DRIVING_AGE = 17

const DAY_MIN = 1
const DAY_MAX = 31
const MONTH_MIN = 1
const MONTH_MAX = 12
const YEAR_MIN = 1000
const YEAR_MAX = 9999

const dateKeys = (prefix) => ({
  dayKey: `${prefix}-day`,
  monthKey: `${prefix}-month`,
  yearKey: `${prefix}-year`
})

const isRealDate = (year, month, day) => {
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

// The calendar / not-future / age rules shared by both factories: returns a Joi
// error for the first rule that fails, or null when the date is acceptable.
const checkDobConstraints = (year, month, day, now, helpers) => {
  if (!isRealDate(year, month, day)) {
    return helpers.error('date.real')
  }
  const date = new Date(year, month - 1, day)
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
  return null
}

const dobMessages = (label) => ({
  'date.real': `${label} must be a real date`,
  'date.future': `${label} must be in the past`,
  'date.tooYoung': `You must be at least ${MIN_DRIVING_AGE} years old`,
  'date.tooOld': `Enter a ${label.toLowerCase()} less than ${MAX_AGE} years ago`
})

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

// All errors land on `-day` so the summary link points at the first box, and
// the partials' per-part `govuk-input--error` logic highlights the day input.
// The custom is the single source of truth for the DOB — it gates blank vs
// partial vs full and coerces all three parts to Number on success.
function optionalDobSchema(prefix, label) {
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
