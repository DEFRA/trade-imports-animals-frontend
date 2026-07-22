import Joi from 'joi'

import { isRealDate } from './calendar.js'
import { copyFor } from '../../shared/copy.js'
import { validatorDefaults as en } from '../../shared/copy.en.js'
import { validatorDefaults as cy } from '../../shared/copy.cy.js'

// Default messages when a call site passes no feature message — sourced
// from the shared copy module so they swap with the locale.
const defaults = copyFor({ en, cy })

const POSTCODE = /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/
const VEHICLE_REG = /^[A-Za-z]{2}\d{2}\s?[A-Za-z]{3}$/
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
      .messages({ 'string.max': message ?? defaults.maxLength(max) })
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

export const postcode = (name, message = defaults.postcode) =>
  pattern(name, POSTCODE, message)

export const vehicleReg = (name, message = defaults.vehicleReg) =>
  pattern(name, VEHICLE_REG, message)

export const ukPhone = (name, message = defaults.ukPhone) =>
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

export const requiredOneOf = (name, values, message) =>
  single(
    name,
    Joi.string()
      .trim()
      .required()
      .valid(...values)
      .messages({
        'string.empty': message,
        'any.required': message,
        'any.only': message
      })
  )

export const oneOf = (name, values, message = defaults.oneOf) =>
  single(
    name,
    Joi.string()
      .allow('')
      .valid('', ...values)
      .messages({ 'any.only': message })
  )

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
        'number.base': message ?? defaults.wholeNumber,
        'number.range': message ?? defaults.numberBetween(min, max)
      })
  )

export const currency = (name, message = defaults.currency) =>
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

// A date field's fill state: none of the three parts entered, some but not
// all, or all three.
const classifyDateFill = (filledCount, totalCount) => {
  if (filledCount === 0) return 'empty'
  if (filledCount < totalCount) return 'partial'
  return 'complete'
}

const isValidCalendarDate = (parts) => {
  const [parsedDay, parsedMonth, parsedYear] = parts.map(Number)
  return isRealDate(parsedYear, parsedMonth, parsedDay)
}

export const dateParts = (name, message = defaults.date) => {
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
        const fill = classifyDateFill(filled.length, parts.length)
        if (fill === 'empty') return day
        if (fill === 'partial') return helpers.error('any.invalid')
        return isValidCalendarDate(parts) ? day : helpers.error('any.invalid')
      })
      .messages({ 'any.invalid': message }),
    [monthKey]: Joi.any(),
    [yearKey]: Joi.any()
  }).unknown(true)
}
