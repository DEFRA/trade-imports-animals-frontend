import { validate } from '../../../../../../lib/validate/index.js'
import { fields, splitStored } from './controller.js'

export const validateStoredAnswers = async (answers) => {
  const stored = answers.countyParishHoldingCph
  // No stored value → obligation model catches it. The rules are all
  // `requiredExactDigits` (they would spuriously flag every blank part);
  // early-return keeps the hook's job to "does the stored value validate".
  if (!stored) {
    return {}
  }
  const { errors } = validate(fields, splitStored(stored))
  return errors ?? {}
}
