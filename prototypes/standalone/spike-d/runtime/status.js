import { schema, validateValue } from '../validation/index.js'
import { isEmpty } from '../lib/fieldutil.js'
import { allSelectedAddonsComplete } from '../lib/addons/index.js'
import { stepMeta, stepFields } from './step-meta.js'
import {
  requiredNow,
  requiredBecause,
  applicableSteps
} from './applicability.js'

const STATUS = {
  NOT_APPLICABLE: 'not-applicable',
  COMPLETE: 'complete',
  PARTIAL: 'partial',
  NOT_STARTED: 'not-started'
}
const STEP_KIND = { LOOP: 'loop', SUBTASKS: 'subtasks' }

export function fieldPresentAndValid(fieldId, answers) {
  if (isEmpty(answers[fieldId])) {
    return false
  }
  return (
    validateValue(schema.properties[fieldId], answers[fieldId], fieldId)
      .length === 0
  )
}

const loopStatus = (meta, answers) => {
  if (answers[meta.done] === true) {
    return STATUS.COMPLETE
  }
  return (answers[meta.arrayKey] ?? []).length
    ? STATUS.PARTIAL
    : STATUS.NOT_STARTED
}

const subtasksStatus = (answers) => {
  if (answers.selectedAddons === undefined) {
    return STATUS.NOT_STARTED
  }
  return allSelectedAddonsComplete(answers) ? STATUS.COMPLETE : STATUS.PARTIAL
}

const fieldStatus = (stepId, answers) => {
  const required = requiredNow(answers)
  const requiredOfStep = stepFields(stepId).filter((field) =>
    required.has(field)
  )
  const allOk = requiredOfStep.every((field) =>
    fieldPresentAndValid(field, answers)
  )
  if (requiredOfStep.length && allOk) {
    return STATUS.COMPLETE
  }
  const anyAnswered = stepFields(stepId).some(
    (field) => !isEmpty(answers[field])
  )
  return anyAnswered ? STATUS.PARTIAL : STATUS.NOT_STARTED
}

export function status(answers, stepId) {
  if (!applicableSteps(answers).includes(stepId)) {
    return STATUS.NOT_APPLICABLE
  }
  const meta = stepMeta[stepId] ?? {}
  if (meta.kind === STEP_KIND.LOOP) {
    return loopStatus(meta, answers)
  }
  if (meta.kind === STEP_KIND.SUBTASKS) {
    return subtasksStatus(answers)
  }
  return fieldStatus(stepId, answers)
}

export const allComplete = (answers) =>
  applicableSteps(answers).every(
    (id) => status(answers, id) === STATUS.COMPLETE
  )

const loopMissing = (stepId, meta, answers) =>
  answers[meta.done] !== true
    ? [
        {
          stepId,
          fieldId: meta.arrayKey,
          because: requiredBecause(meta.arrayKey, answers)
        }
      ]
    : []

const subtasksMissing = (stepId, answers) =>
  !allSelectedAddonsComplete(answers)
    ? [{ stepId, fieldId: 'selectedAddons', because: [] }]
    : []

const fieldsMissing = (stepId, answers) => {
  const required = requiredNow(answers)
  return stepFields(stepId)
    .filter((fieldId) => required.has(fieldId) && isEmpty(answers[fieldId]))
    .map((fieldId) => ({
      stepId,
      fieldId,
      because: requiredBecause(fieldId, answers)
    }))
}

export function missingRequired(answers) {
  return applicableSteps(answers).flatMap((stepId) => {
    const meta = stepMeta[stepId] ?? {}
    if (meta.kind === STEP_KIND.LOOP) {
      return loopMissing(stepId, meta, answers)
    }
    if (meta.kind === STEP_KIND.SUBTASKS) {
      return subtasksMissing(stepId, answers)
    }
    return fieldsMissing(stepId, answers)
  })
}
