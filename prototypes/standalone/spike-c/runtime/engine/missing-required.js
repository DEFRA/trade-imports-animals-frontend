import { steps, fields, stepById } from '../model.js'
import { humanize } from '../../lib/fieldutil.js'
import { allSelectedAddonsComplete } from '../../lib/addons/index.js'
import { evaluate } from './evaluation.js'

/**
 * The read-side of the snapshot: which steps apply, which fields a step still
 * needs, and each unsatisfied requirement with its authored `because` — C's
 * showcase.
 */

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

export function missingRequiredErrors(answers) {
  return missingRequired(answers).map((entry) => ({
    ...entry,
    message: `${humanize(entry.fieldId)} is required`
  }))
}
