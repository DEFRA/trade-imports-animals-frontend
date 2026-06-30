import { steps, fields, rules, stepById } from './model.js'
import { evalCondition } from '../lib/conditions.js'
import { isSatisfied, humanize, ageInYears } from '../lib/fieldutil.js'
import { allSelectedAddonsComplete } from '../lib/addons/index.js'

/**
 * The requirement-graph engine. `evaluate(answers)` derives, from the data model
 * + the rules, which fields are **required** (and **why** — authored reasons,
 * the paradigm's signature) and which steps are **live**. Everything the
 * contract needs is a thin read over this snapshot. Pure + memoised per answers.
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

/** Steps in order that currently apply (normal steps always; loops by rule). */
export function applicableSteps(answers) {
  const { liveStepReasons } = evaluate(answers)
  const stepApplies = (step) =>
    step.kind !== 'loop' || liveStepReasons.has(step.id)
  return steps.filter(stepApplies).map((step) => step.id)
}

/** Required field ids of a step under the current answers. */
export function requiredFieldsOfStep(stepId, snapshot) {
  return Object.keys(fields).filter(
    (id) => fields[id].step === stepId && snapshot.requiredByField.has(id)
  )
}

const asReasons = (reasons) => reasons.map((reason) => ({ reason }))

const loopStepMissing = (step, snapshot, answers) =>
  answers[step.done] !== true
    ? [
        {
          stepId: step.id,
          fieldId: step.arrayKey,
          because: asReasons(snapshot.liveStepReasons.get(step.id) ?? [])
        }
      ]
    : []

const subtasksStepMissing = (step, answers) =>
  allSelectedAddonsComplete(answers)
    ? []
    : [{ stepId: step.id, fieldId: 'selectedAddons', because: [] }]

const normalStepMissing = (stepId, snapshot) =>
  requiredFieldsOfStep(stepId, snapshot)
    .filter((fieldId) => !snapshot.satisfied.has(fieldId))
    .map((fieldId) => ({
      stepId,
      fieldId,
      because: asReasons(snapshot.requiredByField.get(fieldId))
    }))

/** Each unsatisfied requirement with its authored `because` — C's showcase. */
export function missingRequired(answers) {
  const snapshot = evaluate(answers)
  const stepMissing = (stepId) => {
    const step = stepById.get(stepId)
    if (step.kind === 'loop') {
      return loopStepMissing(step, snapshot, answers)
    }
    if (step.kind === 'subtasks') {
      return subtasksStepMissing(step, answers)
    }
    return normalStepMissing(stepId, snapshot)
  }
  return applicableSteps(answers).flatMap(stepMissing)
}

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

/** Holistic assertion rules (min-age / lte), with authored reasons. */
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

export function missingRequiredErrors(answers) {
  return missingRequired(answers).map((entry) => ({
    ...entry,
    message: `${humanize(entry.fieldId)} is required`
  }))
}
