import { model, stepById } from '../model.js'
import { evalCondition } from '../conditions.js'
import { isSatisfied } from '../util.js'
import { allSelectedAddonsComplete } from '../../lib/addons/index.js'
import { STATUS, STEP_KIND } from './constants.js'

/**
 * Status/applicability are *derived* from the model data: applicability from
 * each step's `appliesWhen` condition; completeness from each field's
 * `required`. Nothing here knows about njk, routes or GDS tags.
 */

export function applicableStepIds(answers) {
  return model.steps
    .filter((step) => evalCondition(step.appliesWhen, answers))
    .map((step) => step.id)
}

function requiredFields(step, answers) {
  return (step.fields ?? []).filter(
    (field) =>
      field.required ||
      (field.requiredWhen && evalCondition(field.requiredWhen, answers))
  )
}

function loopStatus(step, answers) {
  if (answers[step.done] === true) {
    return STATUS.COMPLETE
  }
  return (answers[step.arrayKey] ?? []).length
    ? STATUS.PARTIAL
    : STATUS.NOT_STARTED
}

function subtasksStatus(answers) {
  if (answers.selectedAddons === undefined) {
    return STATUS.NOT_STARTED
  }
  return allSelectedAddonsComplete(answers) ? STATUS.COMPLETE : STATUS.PARTIAL
}

function fieldStatus(step, answers) {
  const required = requiredFields(step, answers)
  const allRequired = required.every((field) =>
    isSatisfied(field, answers[field.id])
  )
  if (required.length && allRequired) {
    return STATUS.COMPLETE
  }
  const anyAnswered = (step.fields ?? []).some((field) =>
    isSatisfied(field, answers[field.id])
  )
  return anyAnswered ? STATUS.PARTIAL : STATUS.NOT_STARTED
}

export function status(answers, stepId) {
  if (!applicableStepIds(answers).includes(stepId)) {
    return STATUS.NOT_APPLICABLE
  }
  const step = stepById.get(stepId)
  if (step.kind === STEP_KIND.LOOP) {
    return loopStatus(step, answers)
  }
  if (step.kind === STEP_KIND.SUBTASKS) {
    return subtasksStatus(answers)
  }
  return fieldStatus(step, answers)
}

export function allComplete(answers) {
  return applicableStepIds(answers).every(
    (stepId) => status(answers, stepId) === STATUS.COMPLETE
  )
}
