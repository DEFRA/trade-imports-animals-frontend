import { model } from '../../runtime/model.js'
import { evalCondition } from '../../runtime/conditions.js'
import { ageInYears } from '../../runtime/util.js'

/** The declarative holistic business rules (validation.md moment 4). */

const RULE_KIND = Object.freeze({ MIN_AGE: 'min-age', LTE: 'lte' })

const minAgeError = (rule, answers) => {
  const age = ageInYears(answers[rule.field])
  if (age === undefined || age >= rule.min) {
    return null
  }
  return {
    stepId: rule.stepId,
    fieldId: rule.fieldId,
    message: rule.reason,
    because: []
  }
}

const lteError = (rule, answers) => {
  const left = Number(answers[rule.left])
  const right = Number(answers[rule.right])
  if (Number.isNaN(left) || Number.isNaN(right) || left <= right) {
    return null
  }
  return {
    stepId: rule.stepId,
    fieldId: rule.fieldId,
    message: rule.reason,
    because: []
  }
}

const ruleEvaluators = {
  [RULE_KIND.MIN_AGE]: minAgeError,
  [RULE_KIND.LTE]: lteError
}

const ruleError = (rule, answers) => {
  const evaluate = ruleEvaluators[rule.kind]
  return evaluate ? evaluate(rule, answers) : null
}

export function businessRuleErrors(answers) {
  return (model.rules ?? [])
    .filter((rule) => !rule.when || evalCondition(rule.when, answers))
    .map((rule) => ruleError(rule, answers))
    .filter(Boolean)
}
