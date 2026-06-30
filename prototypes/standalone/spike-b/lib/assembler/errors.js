import { evalCondition, provenance } from '../conditions.js'
import { isSatisfied, humanize, ageInYears } from '../fieldutil.js'
import { allSelectedAddonsComplete } from '../addons/index.js'

/**
 * Validation error builders: missing-required (per step kind) and the
 * declarative business rules (min-age, lte). Each error carries step
 * provenance via `reasonFor`.
 */

export const RULE_KIND_MIN_AGE = 'min-age'
export const RULE_KIND_LTE = 'lte'

export const reasonFor = (entry) => ({
  field: entry.field,
  eq: entry.eq,
  reason: `You answered "${entry.eq}" for ${humanize(entry.field)}`
})

export const loopMissingErrors = (step, stepId, stepBecause, answers) =>
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

export const subtasksMissingErrors = (answers, stepId) =>
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

const isFieldRequired = (field, answers) =>
  field.required ||
  (field.requiredWhen && evalCondition(field.requiredWhen, answers))

export const fieldRequiredErrors = (step, stepId, stepBecause, answers) =>
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

export const minAgeError = (rule, answers) => {
  const age = ageInYears(answers[rule.field])
  if (age !== undefined && age < rule.min) {
    return {
      stepId: rule.stepId,
      fieldId: rule.fieldId,
      message: rule.reason,
      because: []
    }
  }
  return undefined
}

export const lteError = (rule, answers) => {
  const left = Number(answers[rule.left])
  const right = Number(answers[rule.right])
  if (!Number.isNaN(left) && !Number.isNaN(right) && left > right) {
    return {
      stepId: rule.stepId,
      fieldId: rule.fieldId,
      message: rule.reason,
      because: []
    }
  }
  return undefined
}
