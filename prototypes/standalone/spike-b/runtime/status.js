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

const STATUS = {
  notApplicable: 'not-applicable',
  complete: 'complete',
  partial: 'partial',
  notStarted: 'not-started'
}
const STEP_KIND = { loop: 'loop', subtasks: 'subtasks' }

function requiredFields(stepId, answers) {
  return fieldsFor(stepId).filter(
    (field) =>
      field.required ||
      (field.requiredWhen && evalCondition(field.requiredWhen, answers))
  )
}

const loopStatus = (state, answers) => {
  if (answers[state.done] === true) {
    return STATUS.complete
  }
  return (answers[state.arrayKey] ?? []).length
    ? STATUS.partial
    : STATUS.notStarted
}

const subtasksStatus = (answers) => {
  if (answers.selectedAddons === undefined) {
    return STATUS.notStarted
  }
  return allSelectedAddonsComplete(answers) ? STATUS.complete : STATUS.partial
}

const fieldsStatus = (stepId, answers) => {
  const required = requiredFields(stepId, answers)
  const allRequired = required.every((field) =>
    isSatisfied(field, answers[field.id])
  )
  if (required.length && allRequired) {
    return STATUS.complete
  }
  const anyAnswered = fieldsFor(stepId).some((field) =>
    isSatisfied(field, answers[field.id])
  )
  return anyAnswered ? STATUS.partial : STATUS.notStarted
}

export function status(answers, stepId) {
  if (!applicableSteps(answers).includes(stepId)) {
    return STATUS.notApplicable
  }
  const state = machine.states[stepId]
  if (state.kind === STEP_KIND.loop) {
    return loopStatus(state, answers)
  }
  if (state.kind === STEP_KIND.subtasks) {
    return subtasksStatus(answers)
  }
  return fieldsStatus(stepId, answers)
}

export const allComplete = (answers) =>
  applicableSteps(answers).every(
    (stepId) => status(answers, stepId) === STATUS.complete
  )
