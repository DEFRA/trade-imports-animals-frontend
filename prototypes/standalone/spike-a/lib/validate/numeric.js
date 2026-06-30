import Joi from 'joi'

/**
 * Numeric/amount schema factories used by sections.js / addons.js
 * (integerYearsSchema, vehicleYearSchema, currencySchema). Each declares a
 * field's canonical rules once so they compose with `Joi.object().concat(...)`.
 */

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
