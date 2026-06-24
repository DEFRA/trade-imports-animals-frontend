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

/**
 * Integer-years field: whole number within [min, max]. Used for
 * `yearsNoClaims` and `ncdYears`. Two friendly strings — `enterMessage`
 * (action phrasing for the required case, e.g. "Enter how many years…") and
 * `noun` (subject phrasing for the range case, e.g. "Years must be…") — so
 * the wording reads naturally for both errors.
 *
 * `required: true` (default) keeps the old behaviour. `required: false`
 * swaps `.required()` for `.empty('')` so an unfilled box passes through —
 * format / range checks still fire on anything the user actually typed.
 */
export function integerYearsSchema({
  name,
  enterMessage,
  noun,
  min,
  max,
  required = true
}) {
  const range = `${noun} must be a whole number between ${min} and ${max}`
  // `.empty('')` collapses an empty input string to undefined *before* `.required()`
  // runs, so a blank submit fires `any.required` (enterMessage) rather than
  // `Number('')` coercing to 0 and tripping a misleading range error.
  const base = Joi.number().integer().min(min).max(max).empty('')
  const field = (required ? base.required() : base).messages({
    'any.required': enterMessage,
    'number.base': range,
    'number.integer': range,
    'number.min': range,
    'number.max': range
  })
  return Joi.object({ [name]: field }).unknown(true)
}

/**
 * Vehicle-year field: four-digit year between 1900 and `currentYear()+1`.
 * Computed at validate time so the prototype doesn't go stale next January.
 *
 * Same `required` semantics as `integerYearsSchema` — pass `required: false`
 * to skip validation when the user leaves the box empty.
 */
export function vehicleYearSchema({
  name,
  enterMessage,
  noun,
  currentYear,
  required = true
}) {
  const year = currentYear ?? new Date().getFullYear()
  // `.empty('')` ahead of `.required()` so a blank submit fires `any.required`
  // (enterMessage) instead of being coerced to 0 and tripping the range error.
  const base = Joi.number()
    .integer()
    .min(1900)
    .max(year + 1)
    .empty('')
  const field = (required ? base.required() : base).messages({
    'any.required': enterMessage,
    'number.base': `${noun} must be a number`,
    'number.integer': `${noun} must be a whole number`,
    'number.min': `${noun} must be between 1900 and ${year + 1}`,
    'number.max': `${noun} must be between 1900 and ${year + 1}`
  })
  return Joi.object({ [name]: field }).unknown(true)
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
  // `.empty('')` collapses a typed-then-cleared input to undefined so the
  // store never carries an empty-string phone — keeps the rows() output and
  // the on-page error UX consistent in both required and optional modes.
  let field = Joi.string()
    .trim()
    .empty('')
    .pattern(PHONE_ALLOWED)
    .custom((value, helpers) => {
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
    field = field.required().messages({
      'any.required': enterMessage,
      'string.pattern.base': formatMessage,
      'phone.length': formatMessage
    })
  }
  return Joi.object({ [name]: field }).unknown(true)
}

/**
 * Whole-pounds currency schema for fields like `estimatedValue`,
 * `excessAmount`, `claimAmount` and `modValue`.
 *
 * Lenient parsing: strip a leading `£`, thousands-separator commas, and any
 * internal whitespace before validating, so paste-ins like `£1,234` are
 * accepted. After cleaning, the string must match `^\d+$` and the resulting
 * `Number` must be `> 0` — decimals (`5.0`), exponentials (`5e3`), signs
 * (`+5` / `-5`) and zero are all rejected. The strict regex is the only way
 * to filter out forms `Number()` happily coerces.
 *
 * Optional by default — empty input passes through as `undefined`, matching
 * the iteration-3 DOB/phone pattern. Switch `required: true` to make blanks
 * trigger `enterMessage`.
 */
export function currencySchema({
  name,
  enterMessage,
  formatMessage,
  required = false
}) {
  return Joi.object({
    [name]: Joi.any()
      .custom((raw, helpers) => {
        const cleaned = String(raw ?? '')
          .trim()
          .replace(/[£,\s]/g, '')
        if (cleaned === '') {
          if (required) {
            return helpers.error('any.required')
          }
          return undefined
        }
        if (!/^\d+$/.test(cleaned)) {
          return helpers.error('currency.format')
        }
        const n = Number(cleaned)
        if (n <= 0) {
          return helpers.error('currency.format')
        }
        return n
      }, 'currency')
      .messages({
        'any.required': enterMessage,
        'currency.format': formatMessage
      })
  }).unknown(true)
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
