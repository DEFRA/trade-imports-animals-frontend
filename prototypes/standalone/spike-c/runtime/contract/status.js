import { fields, stepById } from '../model.js'
import {
  evaluate,
  applicableSteps,
  requiredFieldsOfStep
} from '../engine/index.js'
import { isSatisfied } from '../../lib/fieldutil.js'
import { allSelectedAddonsComplete } from '../../lib/addons/index.js'

/**
 * Task status derivation: each step's complete/partial/not-started state under
 * the current answers, and whether the whole live journey is complete.
 */

const STATUS = {
  notApplicable: 'not-applicable',
  complete: 'complete',
  partial: 'partial',
  notStarted: 'not-started'
}

const STEP_KIND = { loop: 'loop', subtasks: 'subtasks' }

const loopStepStatus = (step, answers) => {
  if (answers[step.done] === true) {
    return STATUS.complete
  }
  return (answers[step.arrayKey] ?? []).length
    ? STATUS.partial
    : STATUS.notStarted
}

const subtasksStepStatus = (answers) => {
  if (answers.selectedAddons === undefined) {
    return STATUS.notStarted
  }
  return allSelectedAddonsComplete(answers) ? STATUS.complete : STATUS.partial
}

const allRequiredSatisfied = (required, snapshot) =>
  required.length > 0 &&
  required.every((fieldId) => snapshot.satisfied.has(fieldId))

const anyFieldAnswered = (stepId, answers) =>
  Object.keys(fields).some(
    (fieldId) =>
      fields[fieldId].step === stepId &&
      isSatisfied(fields[fieldId], answers[fieldId])
  )

const fieldStepStatus = (stepId, answers) => {
  const snapshot = evaluate(answers)
  const required = requiredFieldsOfStep(stepId, snapshot)
  if (allRequiredSatisfied(required, snapshot)) {
    return STATUS.complete
  }
  return anyFieldAnswered(stepId, answers) ? STATUS.partial : STATUS.notStarted
}

export function status(answers, stepId) {
  if (!applicableSteps(answers).includes(stepId)) {
    return STATUS.notApplicable
  }
  const step = stepById.get(stepId)
  if (step.kind === STEP_KIND.loop) {
    return loopStepStatus(step, answers)
  }
  if (step.kind === STEP_KIND.subtasks) {
    return subtasksStepStatus(answers)
  }
  return fieldStepStatus(stepId, answers)
}

export const allComplete = (answers) =>
  applicableSteps(answers).every(
    (stepId) => status(answers, stepId) === STATUS.complete
  )
