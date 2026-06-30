import { machine } from './model.js'
import { applicableSteps } from './navigation.js'
import { fieldsFor } from './steps.js'
import { evalCondition } from '../lib/conditions.js'
import { isSatisfied } from '../lib/fieldutil.js'
import { allSelectedAddonsComplete } from '../lib/addons/index.js'

/**
 * Per-step and whole-journey status, layered on `context.fields` — the FSM does
 * not give completeness for free, so it is derived here from the answers and
 * each step's required fields.
 */

function requiredFields(stepId, answers) {
  return fieldsFor(stepId).filter(
    (field) =>
      field.required ||
      (field.requiredWhen && evalCondition(field.requiredWhen, answers))
  )
}

export function status(answers, stepId) {
  if (!applicableSteps(answers).includes(stepId)) {
    return 'not-applicable'
  }
  const state = machine.states[stepId]
  if (state.kind === 'loop') {
    if (answers[state.done] === true) {
      return 'complete'
    }
    return (answers[state.arrayKey] ?? []).length ? 'partial' : 'not-started'
  }
  if (state.kind === 'subtasks') {
    if (answers.selectedAddons === undefined) {
      return 'not-started'
    }
    return allSelectedAddonsComplete(answers) ? 'complete' : 'partial'
  }
  const required = requiredFields(stepId, answers)
  const allRequired = required.every((field) =>
    isSatisfied(field, answers[field.id])
  )
  if (required.length && allRequired) {
    return 'complete'
  }
  const anyAnswered = fieldsFor(stepId).some((field) =>
    isSatisfied(field, answers[field.id])
  )
  return anyAnswered ? 'partial' : 'not-started'
}

export const allComplete = (answers) =>
  applicableSteps(answers).every(
    (stepId) => status(answers, stepId) === 'complete'
  )
