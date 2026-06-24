import Joi from 'joi'

/**
 * Tiny validation runner shared by every prototype POST handler.
 *
 * `validatePayload(schema, payload)` returns either the coerced typed value
 * (numbers parsed from strings, unknown keys dropped) or a pair of error
 * structures shaped for the GOV.UK macros:
 *   - `errors`        { fieldName: 'First message' } — drives per-field errorMessage
 *   - `errorSummary`  [{ text, href }]               — drives govukErrorSummary
 *
 * For day/month/year date inputs the per-part error keys are joined with the
 * input's prefix (e.g. `dateOfBirth-day`), matching the macro's id convention.
 *
 * `dobSchema`, `integerYearsSchema`, `vehicleYearSchema` and `phoneSchema`
 * are the factories used by sections.js / addons.js so each field's canonical
 * rules are declared once and composed with `Joi.object().concat(...)`.
 */

export const MAX_AGE = 120
export const MIN_DRIVING_AGE = 17

export function validatePayload(schema, payload) {
  if (!schema) {
    return { value: payload, errors: null, errorSummary: null }
  }
  // Unknown keys (other section fields, csrf crumb) pass through untouched —
  // the schemas opt in to `.unknown(true)`. We only coerce the keys each schema
  // names, leaving the rest as strings for `collect()` to read as today.
  const result = schema.validate(payload, {
    abortEarly: false,
    convert: true
  })
  if (!result.error) {
    return { value: result.value, errors: null, errorSummary: null }
  }
  const errors = {}
  const errorSummary = []
  for (const detail of result.error.details) {
    const name = detail.path[0]
    if (errors[name] === undefined) {
      errors[name] = detail.message
      errorSummary.push({ text: detail.message, href: `#${name}` })
    }
  }
  return { value: result.value, errors, errorSummary }
}

/**
 * GDS-canonical DOB schema for a `${prefix}-day|-month|-year` triple.
 *
 * Each part is required and numeric in its sensible range. The cross-field
 * checks (real calendar date, not in the future, age 17-120) hang off the
 * `-day` key so their Joi path is `[`${prefix}-day`]` and the error renders
 * against the date input as one combined message, anchored at #${prefix}-day.
 * The check short-circuits unless all three parts are themselves valid, so
 * per-part errors take precedence.
 *
 * @param {string} prefix the date input's namePrefix, e.g. 'dateOfBirth'
 * @param {string} label friendly label used in error messages, e.g. 'Date of birth'
 */
export function dobSchema(prefix, label) {
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

/**
 * Integer-years field: required whole number within [min, max]. Used for
 * `yearsNoClaims` and `ncdYears`. Two friendly strings — `enterMessage`
 * (action phrasing for the required case, e.g. "Enter how many years…") and
 * `noun` (subject phrasing for the range case, e.g. "Years must be…") — so
 * the wording reads naturally for both errors.
 */
export function integerYearsSchema({ name, enterMessage, noun, min, max }) {
  const range = `${noun} must be a whole number between ${min} and ${max}`
  return Joi.object({
    [name]: Joi.number().integer().min(min).max(max).required().messages({
      'any.required': enterMessage,
      'number.base': range,
      'number.integer': range,
      'number.min': range,
      'number.max': range
    })
  }).unknown(true)
}

/**
 * Vehicle-year field: required four-digit year between 1900 and `currentYear()+1`.
 * Computed at validate time so the prototype doesn't go stale next January.
 */
export function vehicleYearSchema({ name, enterMessage, noun, currentYear }) {
  const year = currentYear ?? new Date().getFullYear()
  return Joi.object({
    [name]: Joi.number()
      .integer()
      .min(1900)
      .max(year + 1)
      .required()
      .messages({
        'any.required': enterMessage,
        'number.base': `${noun} must be a number`,
        'number.integer': `${noun} must be a whole number`,
        'number.min': `${noun} must be between 1900 and ${year + 1}`,
        'number.max': `${noun} must be between 1900 and ${year + 1}`
      })
  }).unknown(true)
}

/**
 * GDS-lenient telephone number schema.
 *
 * Follows the Design System guidance: accept the messy variety of phone
 * formats users actually submit rather than enforcing a strict regex. The
 * sanity checks are:
 *   - allow-list of characters (digits, spaces, `+`, `-`, `(`, `)`,
 *     `.,;` and the letters used in extension labels like `ext` and `x`);
 *   - the digit count, after stripping non-digits, must be between
 *     `minDigits` and `maxDigits` (defaults 7..15 — E.164 max is 15).
 *
 * Both invalid-format and digit-count failures share `formatMessage` because
 * the GDS hint exposes the accepted formats with one example string; users
 * don't need to distinguish "bad characters" from "wrong length".
 */
export const PHONE_ALLOWED = /^[0-9+()\-.,;\sextEXT]+$/
const PHONE_DEFAULT_MIN_DIGITS = 7
const PHONE_DEFAULT_MAX_DIGITS = 15

export function phoneSchema({
  name,
  enterMessage,
  formatMessage,
  required = true,
  minDigits = PHONE_DEFAULT_MIN_DIGITS,
  maxDigits = PHONE_DEFAULT_MAX_DIGITS
}) {
  let field = Joi.string()
    .trim()
    .allow('')
    .pattern(PHONE_ALLOWED)
    .custom((value, helpers) => {
      if (!value) {
        return value
      }
      const digitCount = value.replace(/\D/g, '').length
      if (digitCount < minDigits || digitCount > maxDigits) {
        return helpers.error('phone.length')
      }
      return value
    }, 'phone digit count')
    .messages({
      'string.pattern.base': formatMessage,
      'phone.length': formatMessage
    })
  if (required) {
    // `.empty('')` plus `.required()` lets the partial post an empty string
    // (the user typed nothing) without tripping the more generic
    // `string.empty` message — `enterMessage` covers it via `any.required`.
    field = field.empty('').required().messages({
      'any.required': enterMessage,
      'string.pattern.base': formatMessage,
      'phone.length': formatMessage
    })
  }
  return Joi.object({ [name]: field }).unknown(true)
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
