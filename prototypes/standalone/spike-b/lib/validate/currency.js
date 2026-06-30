import Joi from 'joi'

const CURRENCY_NOISE = /[£,\s]/g
const WHOLE_POUNDS = /^\d+$/

const cleanCurrencyInput = (raw) =>
  String(raw ?? '')
    .trim()
    .replace(CURRENCY_NOISE, '')

const isWholePounds = (cleaned) => WHOLE_POUNDS.test(cleaned)

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
        const cleaned = cleanCurrencyInput(raw)
        if (cleaned === '') {
          if (required) {
            return helpers.error('any.required')
          }
          return undefined
        }
        if (!isWholePounds(cleaned)) {
          return helpers.error('currency.format')
        }
        const amount = Number(cleaned)
        if (amount <= 0) {
          return helpers.error('currency.format')
        }
        return amount
      }, 'currency')
      .messages({
        'any.required': enterMessage,
        'currency.format': formatMessage
      })
  }).unknown(true)
}
