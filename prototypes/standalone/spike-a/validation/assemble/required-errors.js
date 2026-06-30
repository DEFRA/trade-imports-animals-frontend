import { evalCondition, provenance } from '../../runtime/conditions.js'
import { isSatisfied, humanize } from '../../runtime/util.js'
import { allSelectedAddonsComplete } from '../../lib/addons/index.js'
import { applicableSteps } from './applicable.js'

const STEP_KIND = Object.freeze({ LOOP: 'loop', SUBTASKS: 'subtasks' })

export function reasonFor(entry) {
  return {
    field: entry.field,
    eq: entry.eq,
    reason: `You answered "${entry.eq}" for ${humanize(entry.field)}`
  }
}

const loopStepErrors = (step, answers) =>
  (answers[step.arrayKey] ?? []).length
    ? []
    : [
        {
          stepId: step.id,
          fieldId: step.arrayKey,
          message: 'Add at least one claim',
          because: provenance(step.appliesWhen).map(reasonFor)
        }
      ]

const subtasksStepErrors = (step, answers) =>
  allSelectedAddonsComplete(answers)
    ? []
    : [
        {
          stepId: step.id,
          fieldId: 'selectedAddons',
          message: 'Finish every add-on you selected',
          because: []
        }
      ]

const isRequired = (field, answers) =>
  field.required ||
  (field.requiredWhen && evalCondition(field.requiredWhen, answers))

const requiredFieldErrors = (step, answers) =>
  (step.fields ?? [])
    .filter(
      (field) =>
        isRequired(field, answers) && !isSatisfied(field, answers[field.id])
    )
    .map((field) => ({
      stepId: step.id,
      fieldId: field.id,
      message: `${humanize(field.id)} is required`,
      because: [
        ...provenance(step.appliesWhen),
        ...provenance(field.requiredWhen)
      ].map(reasonFor)
    }))

const stepErrors = (step, answers) => {
  if (step.kind === STEP_KIND.LOOP) {
    return loopStepErrors(step, answers)
  }
  if (step.kind === STEP_KIND.SUBTASKS) {
    return subtasksStepErrors(step, answers)
  }
  return requiredFieldErrors(step, answers)
}

export function missingRequiredErrors(answers) {
  return applicableSteps(answers).flatMap((step) => stepErrors(step, answers))
}
