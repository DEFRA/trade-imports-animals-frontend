import { evalCondition } from '../conditions.js'
import { ageInYears } from '../fieldutil.js'

const ruleToError = (rule) => ({
  stepId: rule.stepId,
  fieldId: rule.fieldId,
  message: rule.reason,
  because: []
})

const minAgeError = (rule, answers) => {
  const age = ageInYears(answers[rule.field])
  return age !== undefined && age < rule.min ? ruleToError(rule) : undefined
}

const lteError = (rule, answers) => {
  const left = Number(answers[rule.left])
  const right = Number(answers[rule.right])
  return !Number.isNaN(left) && !Number.isNaN(right) && left > right
    ? ruleToError(rule)
    : undefined
}

const ruleEvaluators = { 'min-age': minAgeError, lte: lteError }

export function businessRuleErrors(view, answers) {
  return (view.rules ?? [])
    .filter((rule) => !rule.when || evalCondition(rule.when, answers))
    .flatMap((rule) => ruleEvaluators[rule.kind]?.(rule, answers) ?? [])
}
