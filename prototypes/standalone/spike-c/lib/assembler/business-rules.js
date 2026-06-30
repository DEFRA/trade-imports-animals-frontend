import { ageInYears } from '../fieldutil.js'

/** Holistic business-rule handlers keyed by rule `kind`. */

const ruleError = (rule) => ({
  stepId: rule.stepId,
  fieldId: rule.fieldId,
  message: rule.reason,
  because: []
})

const minAgeError = (rule, answers) => {
  const age = ageInYears(answers[rule.field])
  return age !== undefined && age < rule.min ? [ruleError(rule)] : []
}

const lteError = (rule, answers) => {
  const left = Number(answers[rule.left])
  const right = Number(answers[rule.right])
  return !Number.isNaN(left) && !Number.isNaN(right) && left > right
    ? [ruleError(rule)]
    : []
}

export const RULE_HANDLERS = { 'min-age': minAgeError, lte: lteError }
