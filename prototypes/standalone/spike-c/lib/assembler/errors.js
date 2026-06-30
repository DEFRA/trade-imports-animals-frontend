import { evalCondition, provenance } from '../conditions.js'
import { isSatisfied, humanize } from '../fieldutil.js'
import { allSelectedAddonsComplete } from '../addons/index.js'

/**
 * Missing-required derivation: the per-step "still need to" errors, each
 * carrying its step provenance (`because`).
 */

const MSG_ADD_CLAIM = 'Add at least one claim'
const MSG_FINISH_ADDONS = 'Finish every add-on you selected'

export const reasonFor = (entry) => ({
  field: entry.field,
  eq: entry.eq,
  reason: `You answered "${entry.eq}" for ${humanize(entry.field)}`
})

const isFieldRequired = (field, answers) =>
  field.required ||
  (field.requiredWhen && evalCondition(field.requiredWhen, answers))

export const loopMissingError = (stepId, step, answers, stepBecause) =>
  (answers[step.arrayKey] ?? []).length
    ? []
    : [
        {
          stepId,
          fieldId: step.arrayKey,
          message: MSG_ADD_CLAIM,
          because: stepBecause
        }
      ]

export const subtasksMissingError = (stepId, answers) =>
  allSelectedAddonsComplete(answers)
    ? []
    : [
        {
          stepId,
          fieldId: 'selectedAddons',
          message: MSG_FINISH_ADDONS,
          because: []
        }
      ]

export const requiredFieldErrors = (stepId, step, answers, stepBecause) =>
  (step.fields ?? [])
    .filter(
      (field) =>
        isFieldRequired(field, answers) &&
        !isSatisfied(field, answers[field.id])
    )
    .map((field) => ({
      stepId,
      fieldId: field.id,
      message: `${humanize(field.id)} is required`,
      because: [
        ...stepBecause,
        ...provenance(field.requiredWhen).map(reasonFor)
      ]
    }))
