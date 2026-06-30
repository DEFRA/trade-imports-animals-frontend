import { rules } from '../model.js'
import { evalCondition } from '../../lib/conditions.js'
import { ageInYears } from '../../lib/fieldutil.js'

/** Holistic assertion rules (min-age / lte), with authored reasons. */

const assertion = (rule) => ({
  stepId: rule.stepId,
  fieldId: rule.fieldId,
  message: rule.reason,
  because: []
})

const minAgeError = (rule, answers) => {
  const age = ageInYears(answers[rule.field])
  return age !== undefined && age < rule.min ? [assertion(rule)] : []
}

const lteError = (rule, answers) => {
  const left = Number(answers[rule.left])
  const right = Number(answers[rule.right])
  return !Number.isNaN(left) && !Number.isNaN(right) && left > right
    ? [assertion(rule)]
    : []
}

export function assertionErrors(answers) {
  const ruleApplies = (rule) => !rule.when || evalCondition(rule.when, answers)
  const ruleError = (rule) => {
    if (rule.kind === 'min-age') {
      return minAgeError(rule, answers)
    }
    if (rule.kind === 'lte') {
      return lteError(rule, answers)
    }
    return []
  }
  return rules.filter(ruleApplies).flatMap(ruleError)
}
