import Joi from 'joi'

const cleanCurrencyInput = (raw) =>
  String(raw ?? '')
    .trim()
    .replace(/[£,\s]/g, '')

const isWholeNumberString = (value) => /^\d+$/.test(value)

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
          return required ? helpers.error('any.required') : undefined
        }
        if (!isWholeNumberString(cleaned)) {
          return helpers.error('currency.format')
        }
        const amount = Number(cleaned)
        return amount <= 0 ? helpers.error('currency.format') : amount
      }, 'currency')
      .messages({
        'any.required': enterMessage,
        'currency.format': formatMessage
      })
  }).unknown(true)
}
