import { fields, rules } from '../model.js'
import { evalCondition } from '../../lib/conditions.js'
import { isSatisfied } from '../../lib/fieldutil.js'

/**
 * The requirement-graph snapshot. `evaluate(answers)` folds the rules + the data
 * model into { requiredByField, liveStepReasons, satisfied }. Pure + memoised
 * per answers object.
 */

const memo = new WeakMap()

// fieldId -> [authored reasons]; an unconditional requirement has no reason.
const alwaysRequiredFields = () =>
  new Map(
    Object.entries(fields)
      .filter(([, field]) => field.required === 'always')
      .map(([id]) => [id, []])
  )

// Fold the require-rules into { requiredByField, liveStepReasons }, seeding the
// field map with the always-required fields. liveStepReasons keys the loop /
// subtask steps a rule makes live, each carrying its authored reasons.
const accumulateRuleEffects = (answers) => {
  const requiredByField = alwaysRequiredFields()
  const liveStepReasons = new Map()
  for (const rule of rules) {
    if (rule.kind !== 'require' || !evalCondition(rule.when, answers)) {
      continue
    }
    for (const fieldId of rule.require ?? []) {
      const reasons = requiredByField.get(fieldId) ?? []
      reasons.push(rule.reason)
      requiredByField.set(fieldId, reasons)
    }
    if (rule.appliesStep) {
      const reasons = liveStepReasons.get(rule.appliesStep) ?? []
      reasons.push(rule.reason)
      liveStepReasons.set(rule.appliesStep, reasons)
    }
  }
  return { requiredByField, liveStepReasons }
}

const satisfiedFieldIds = (answers) =>
  new Set(
    Object.keys(fields).filter((id) => isSatisfied(fields[id], answers[id]))
  )

export function evaluate(answers) {
  if (answers && typeof answers === 'object' && memo.has(answers)) {
    return memo.get(answers)
  }
  const snapshot = {
    ...accumulateRuleEffects(answers),
    satisfied: satisfiedFieldIds(answers)
  }
  if (answers && typeof answers === 'object') {
    memo.set(answers, snapshot)
  }
  return snapshot
}
