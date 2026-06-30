import { toDomain } from './transform.js'
import { missingRequiredErrors } from './required-errors.js'
import { businessRuleErrors } from './business-rules.js'

export { toDomain } from './transform.js'
export { missingRequiredErrors } from './required-errors.js'

/**
 * Whole-object validation + transform (validation.md moment 4): check every
 * applicable required field is present, transform to a domain quote object, and
 * run the declarative holistic business rules. Returns `{ ok, quote, errors }`
 * with step provenance on every error.
 */
export function assembleQuote(answers) {
  const errors = [
    ...missingRequiredErrors(answers),
    ...businessRuleErrors(answers)
  ]
  return { ok: errors.length === 0, quote: toDomain(answers), errors }
}
