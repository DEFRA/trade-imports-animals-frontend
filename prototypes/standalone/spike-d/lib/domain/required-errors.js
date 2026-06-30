import { evalCondition, provenance } from '../conditions.js'
import { isSatisfied, humanize } from '../fieldutil.js'
import { allSelectedAddonsComplete } from '../addons/index.js'

export const reasonFor = (entry) => ({
  field: entry.field,
  eq: entry.eq,
  reason: `You answered "${entry.eq}" for ${humanize(entry.field)}`
})

const loopRequiredError = (step, stepId, stepBecause, answers) =>
  (answers[step.arrayKey] ?? []).length
    ? []
    : [
        {
          stepId,
          fieldId: step.arrayKey,
          message: 'Add at least one claim',
          because: stepBecause
        }
      ]

const subtasksRequiredError = (stepId, answers) =>
  allSelectedAddonsComplete(answers)
    ? []
    : [
        {
          stepId,
          fieldId: 'selectedAddons',
          message: 'Finish every add-on you selected',
          because: []
        }
      ]

const fieldRequiredErrors = (step, stepId, stepBecause, answers) =>
  (step.fields ?? [])
    .filter((field) => {
      const required =
        field.required ||
        (field.requiredWhen && evalCondition(field.requiredWhen, answers))
      return required && !isSatisfied(field, answers[field.id])
    })
    .map((field) => ({
      stepId,
      fieldId: field.id,
      message: `${humanize(field.id)} is required`,
      because: [
        ...stepBecause,
        ...provenance(field.requiredWhen).map(reasonFor)
      ]
    }))

const errorsForStep = (view, stepId, answers) => {
  const step = view.getStep(stepId)
  const stepBecause = view.provenanceForStep(stepId, answers).map(reasonFor)
  if (step.kind === 'loop') {
    return loopRequiredError(step, stepId, stepBecause, answers)
  }
  if (step.kind === 'subtasks') {
    return subtasksRequiredError(stepId, answers)
  }
  return fieldRequiredErrors(step, stepId, stepBecause, answers)
}

export function missingRequiredErrors(view, answers) {
  return view
    .getApplicableSteps(answers)
    .flatMap((stepId) => errorsForStep(view, stepId, answers))
}
