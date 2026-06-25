import { steps, fields, rules, stepById } from './model.js'
import { evalCondition } from '../../shared/conditions.js'
import { isSatisfied, humanize, ageInYears } from '../../shared/fieldutil.js'
import { allSelectedAddonsComplete } from '../../../shared/addons.js'

/**
 * The requirement-graph engine. `evaluate(answers)` derives, from the data model
 * + the rules, which fields are **required** (and **why** — authored reasons,
 * the paradigm's signature) and which steps are **live**. Everything the
 * contract needs is a thin read over this snapshot. Pure + memoised per answers.
 */

const memo = new WeakMap()

export function evaluate(answers) {
  if (answers && typeof answers === 'object' && memo.has(answers)) {
    return memo.get(answers)
  }
  // fieldId -> [authored reasons]; an unconditional requirement has no reason.
  const requiredByField = new Map()
  for (const [id, field] of Object.entries(fields)) {
    if (field.required === 'always') {
      requiredByField.set(id, [])
    }
  }
  // step id -> [authored reasons] for loop/subtask steps a rule makes live.
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
  const satisfied = new Set(
    Object.keys(fields).filter((id) => isSatisfied(fields[id], answers[id]))
  )
  const snapshot = { requiredByField, liveStepReasons, satisfied }
  if (answers && typeof answers === 'object') {
    memo.set(answers, snapshot)
  }
  return snapshot
}

/** Steps in order that currently apply (normal steps always; loops by rule). */
export function applicableSteps(answers) {
  const { liveStepReasons } = evaluate(answers)
  return steps
    .filter((step) => {
      if (step.kind === 'subtasks') {
        return true
      }
      if (step.kind === 'loop') {
        return liveStepReasons.has(step.id)
      }
      return true
    })
    .map((step) => step.id)
}

/** Required field ids of a step under the current answers. */
export function requiredFieldsOfStep(stepId, snapshot) {
  return Object.keys(fields).filter(
    (id) => fields[id].step === stepId && snapshot.requiredByField.has(id)
  )
}

const asReasons = (reasons) => reasons.map((reason) => ({ reason }))

/** Each unsatisfied requirement with its authored `because` — C's showcase. */
export function missingRequired(answers) {
  const snapshot = evaluate(answers)
  const out = []
  for (const stepId of applicableSteps(answers)) {
    const step = stepById.get(stepId)
    if (step.kind === 'loop') {
      if (answers[step.done] !== true) {
        out.push({
          stepId,
          fieldId: step.arrayKey,
          because: asReasons(snapshot.liveStepReasons.get(stepId) ?? [])
        })
      }
      continue
    }
    if (step.kind === 'subtasks') {
      if (!allSelectedAddonsComplete(answers)) {
        out.push({ stepId, fieldId: 'selectedAddons', because: [] })
      }
      continue
    }
    for (const fieldId of requiredFieldsOfStep(stepId, snapshot)) {
      if (!snapshot.satisfied.has(fieldId)) {
        out.push({
          stepId,
          fieldId,
          because: asReasons(snapshot.requiredByField.get(fieldId))
        })
      }
    }
  }
  return out
}

/** Holistic assertion rules (min-age / lte), with authored reasons. */
export function assertionErrors(answers) {
  const out = []
  for (const rule of rules) {
    if (rule.when && !evalCondition(rule.when, answers)) {
      continue
    }
    if (rule.kind === 'min-age') {
      const age = ageInYears(answers[rule.field])
      if (age !== undefined && age < rule.min) {
        out.push({
          stepId: rule.stepId,
          fieldId: rule.fieldId,
          message: rule.reason,
          because: []
        })
      }
    }
    if (rule.kind === 'lte') {
      const left = Number(answers[rule.left])
      const right = Number(answers[rule.right])
      if (!Number.isNaN(left) && !Number.isNaN(right) && left > right) {
        out.push({
          stepId: rule.stepId,
          fieldId: rule.fieldId,
          message: rule.reason,
          because: []
        })
      }
    }
  }
  return out
}

export function missingRequiredErrors(answers) {
  return missingRequired(answers).map((entry) => ({
    ...entry,
    message: `${humanize(entry.fieldId)} is required`
  }))
}
