import Joi from 'joi'

import { isRealDate } from './calendar.js'

/**
 * Convention: every OPTIONAL validator lets '' (blank) through — omit
 * `.allow('')` and an optional field silently becomes save-blocking.
 * `requiredText` is the one save-blocking primitive.
 */

const POSTCODE = /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/
const VEHICLE_REG = /^[A-Za-z]{2}\d{2}\s?[A-Za-z]{3}$/
// GDS-lenient telephone allow-list: digits, spaces and the usual punctuation.
const PHONE_ALLOWED = /^[0-9+()\-.,;\s]+$/

const single = (name, rule) => Joi.object({ [name]: rule }).unknown(true)

export const compose = (...schemas) =>
  schemas.reduce(
    (combined, schema) => combined.concat(schema),
    Joi.object({}).unknown(true)
  )

export const requiredText = (name, message) =>
  single(
    name,
    Joi.string().trim().required().messages({
      'string.empty': message,
      'any.required': message
    })
  )

export const optionalText = (name) =>
  single(name, Joi.string().trim().allow(''))

export const maxText = (name, max, message) =>
  single(
    name,
    Joi.string()
      .trim()
      .allow('')
      .max(max)
      .messages({ 'string.max': message ?? `Enter ${max} characters or fewer` })
  )

export const pattern = (name, regex, message) =>
  single(
    name,
    Joi.string()
      .trim()
      .allow('')
      .pattern(regex)
      .messages({ 'string.pattern.base': message })
  )

export const postcode = (name, message = 'Enter a valid postcode') =>
  pattern(name, POSTCODE, message)

export const vehicleReg = (
  name,
  message = 'Enter a valid registration number'
) => pattern(name, VEHICLE_REG, message)

export const ukPhone = (name, message = 'Enter a valid UK telephone number') =>
  single(
    name,
    Joi.string()
      .trim()
      .allow('')
      .pattern(PHONE_ALLOWED)
      .custom((raw, helpers) => {
        const digits = raw.replace(/\D/g, '')
        if (digits.length < 7 || digits.length > 15) {
          return helpers.error('any.invalid')
        }
        return raw
      })
      .messages({ 'string.pattern.base': message, 'any.invalid': message })
  )

export const oneOf = (name, values, message = 'Select a valid option') =>
  single(
    name,
    Joi.string()
      .allow('')
      .valid('', ...values)
      .messages({ 'any.only': message })
  )

/** Kept as its trimmed string so the stored shape is unchanged. */
export const integerInRange = (name, { min, max, message } = {}) =>
  single(
    name,
    Joi.string()
      .trim()
      .allow('')
      .custom((raw, helpers) => {
        if (!/^-?\d+$/.test(raw)) return helpers.error('number.base')
        const parsed = Number(raw)
        if ((min != null && parsed < min) || (max != null && parsed > max)) {
          return helpers.error('number.range')
        }
        return raw
      })
      .messages({
        'number.base': message ?? 'Enter a whole number',
        'number.range': message ?? `Enter a number between ${min} and ${max}`
      })
  )

/** Returns the cleaned string (£/commas stripped) — controllers must persist
 *  this value, not the raw payload. */
export const currency = (name, message = 'Enter a valid amount') =>
  single(
    name,
    Joi.string()
      .trim()
      .allow('')
      .custom((raw, helpers) => {
        const cleaned = raw.replace(/[£,\s]/g, '')
        if (!/^\d+$/.test(cleaned) || Number(cleaned) <= 0) {
          return helpers.error('any.invalid')
        }
        return cleaned
      })
      .messages({ 'any.invalid': message })
  )

/** Blank (all three empty) passes; a partial or unreal date fails, anchored
 *  on the day part so the error summary points at the first box. */
export const dateParts = (name, message = 'Enter a valid date') => {
  const dayKey = `${name}-day`
  const monthKey = `${name}-month`
  const yearKey = `${name}-year`
  return Joi.object({
    [dayKey]: Joi.any()
      .custom((day, helpers) => {
        const siblings = helpers.state.ancestors[0] ?? {}
        const parts = [day, siblings[monthKey], siblings[yearKey]].map((part) =>
          String(part ?? '').trim()
        )
        const filled = parts.filter((part) => part !== '')
        if (filled.length === 0) return day // optional — all blank passes
        if (filled.length < 3) return helpers.error('any.invalid')
        const [parsedDay, parsedMonth, parsedYear] = parts.map(Number)
        if (!isRealDate(parsedYear, parsedMonth, parsedDay)) {
          return helpers.error('any.invalid')
        }
        return day
      })
      .messages({ 'any.invalid': message }),
    [monthKey]: Joi.any(),
    [yearKey]: Joi.any()
  }).unknown(true)
}
