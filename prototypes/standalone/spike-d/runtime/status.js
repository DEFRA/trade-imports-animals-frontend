import { schema, validateValue } from '../validation/index.js'
import { isEmpty } from '../lib/fieldutil.js'
import { allSelectedAddonsComplete } from '../lib/addons/index.js'
import { stepMeta, stepFields } from './step-meta.js'
import {
  requiredNow,
  requiredBecause,
  applicableSteps
} from './applicability.js'

export function fieldPresentAndValid(fieldId, answers) {
  if (isEmpty(answers[fieldId])) {
    return false
  }
  return (
    validateValue(schema.properties[fieldId], answers[fieldId], fieldId)
      .length === 0
  )
}

export function status(answers, stepId) {
  if (!applicableSteps(answers).includes(stepId)) {
    return 'not-applicable'
  }
  const meta = stepMeta[stepId] ?? {}
  if (meta.kind === 'loop') {
    if (answers[meta.done] === true) {
      return 'complete'
    }
    return (answers[meta.arrayKey] ?? []).length ? 'partial' : 'not-started'
  }
  if (meta.kind === 'subtasks') {
    if (answers.selectedAddons === undefined) {
      return 'not-started'
    }
    return allSelectedAddonsComplete(answers) ? 'complete' : 'partial'
  }
  const required = requiredNow(answers)
  const requiredOfStep = stepFields(stepId).filter((field) =>
    required.has(field)
  )
  const allOk = requiredOfStep.every((field) =>
    fieldPresentAndValid(field, answers)
  )
  if (requiredOfStep.length && allOk) {
    return 'complete'
  }
  const anyAnswered = stepFields(stepId).some(
    (field) => !isEmpty(answers[field])
  )
  return anyAnswered ? 'partial' : 'not-started'
}

export const allComplete = (answers) =>
  applicableSteps(answers).every((id) => status(answers, id) === 'complete')

export function missingRequired(answers) {
  const out = []
  for (const stepId of applicableSteps(answers)) {
    const meta = stepMeta[stepId] ?? {}
    if (meta.kind === 'loop') {
      if (answers[meta.done] !== true) {
        out.push({
          stepId,
          fieldId: meta.arrayKey,
          because: requiredBecause(meta.arrayKey, answers)
        })
      }
      continue
    }
    if (meta.kind === 'subtasks') {
      if (!allSelectedAddonsComplete(answers)) {
        out.push({ stepId, fieldId: 'selectedAddons', because: [] })
      }
      continue
    }
    const required = requiredNow(answers)
    for (const fieldId of stepFields(stepId)) {
      if (required.has(fieldId) && isEmpty(answers[fieldId])) {
        out.push({
          stepId,
          fieldId,
          because: requiredBecause(fieldId, answers)
        })
      }
    }
  }
  return out
}
