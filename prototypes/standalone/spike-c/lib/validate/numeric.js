import Joi from 'joi'

/**
 * Whole-number field schemas: a generic integer-years field and a vehicle
 * year-of-manufacture field. Both share the `required` semantics — `.empty('')`
 * collapses a blank input to undefined before `.required()` runs, so an empty
 * submit fires the friendly `enterMessage` rather than coercing to 0.
 */

const MIN_VEHICLE_YEAR = 1900

// `.empty('')` collapses an empty input string to undefined *before* `.required()`
// runs, so a blank submit fires `any.required` (enterMessage) rather than
// `Number('')` coercing to 0 and tripping a misleading range error.
const requireWhen = (base, required) => (required ? base.required() : base)

const singleFieldObject = (name, field) =>
  Joi.object({ [name]: field }).unknown(true)

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
  const base = Joi.number().integer().min(min).max(max).empty('')
  const field = requireWhen(base, required).messages({
    'any.required': enterMessage,
    'number.base': range,
    'number.integer': range,
    'number.min': range,
    'number.max': range
  })
  return singleFieldObject(name, field)
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
  const base = Joi.number()
    .integer()
    .min(MIN_VEHICLE_YEAR)
    .max(year + 1)
    .empty('')
  const field = requireWhen(base, required).messages({
    'any.required': enterMessage,
    'number.base': `${noun} must be a number`,
    'number.integer': `${noun} must be a whole number`,
    'number.min': `${noun} must be between ${MIN_VEHICLE_YEAR} and ${year + 1}`,
    'number.max': `${noun} must be between ${MIN_VEHICLE_YEAR} and ${year + 1}`
  })
  return singleFieldObject(name, field)
}
