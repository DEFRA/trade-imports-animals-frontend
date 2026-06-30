import { evalCondition, provenance } from './conditions.js'
import { isSatisfied, humanize, ageInYears } from './fieldutil.js'
import { getSelectedAddons, allSelectedAddonsComplete } from './addons/index.js'

const BOOLEAN_TRUE = 'yes'
const DATE_PART_WIDTH = 2

/**
 * Whole-object validation + transform (validation.md moment 4), shared by the
 * derive-Joi spikes. The caller supplies a small **model view** so the same
 * assembler serves different paradigms:
 *
 *   getApplicableSteps(answers)      -> [stepId]
 *   getStep(stepId)                  -> { id, kind?, fields:[spec], done?, arrayKey? }
 *   provenanceForStep(stepId, answers) -> [{ field, eq }]  // why the step is live
 *   rules                            -> declarative business rules
 *
 * Returns `{ ok, quote, errors }`, every error carrying step provenance.
 */
export function makeAssembler(view) {
  const reasonFor = (entry) => ({
    field: entry.field,
    eq: entry.eq,
    reason: `You answered "${entry.eq}" for ${humanize(entry.field)}`
  })

  const ruleToError = (rule) => ({
    stepId: rule.stepId,
    fieldId: rule.fieldId,
    message: rule.reason,
    because: []
  })

  function transformField(field, value) {
    switch (field.type) {
      case 'date':
        return isoDate(value)
      case 'boolean':
        return value === BOOLEAN_TRUE
      case 'number':
      case 'currency':
        return value === '' ? undefined : Number(value)
      default:
        return value
    }
  }

  const transformFields = (step, answers) =>
    Object.fromEntries(
      (step.fields ?? [])
        .filter((field) => answers[field.id] !== undefined)
        .map((field) => [field.id, transformField(field, answers[field.id])])
    )

  const transformClaimItem = (item) => ({
    ...item,
    claimAmount:
      item.claimAmount === undefined ? undefined : Number(item.claimAmount)
  })

  const transformLoopItems = (step, answers) =>
    (answers[step.arrayKey] ?? []).map(transformClaimItem)

  function toDomain(answers) {
    const quote = {}
    for (const stepId of view.getApplicableSteps(answers)) {
      const step = view.getStep(stepId)
      Object.assign(quote, transformFields(step, answers))
      if (step.kind === 'loop') {
        quote[step.arrayKey] = transformLoopItems(step, answers)
      }
      if (step.kind === 'subtasks') {
        quote.selectedAddons = getSelectedAddons(answers)
      }
    }
    return quote
  }

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

  const errorsForStep = (stepId, answers) => {
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

  function missingRequiredErrors(answers) {
    return view
      .getApplicableSteps(answers)
      .flatMap((stepId) => errorsForStep(stepId, answers))
  }

  const minAgeError = (rule, answers) => {
    const age = ageInYears(answers[rule.field])
    return age !== undefined && age < rule.min ? ruleToError(rule) : undefined
  }

  const lteError = (rule, answers) => {
    const left = Number(answers[rule.left])
    const right = Number(answers[rule.right])
    return !Number.isNaN(left) && !Number.isNaN(right) && left > right
      ? ruleToError(rule)
      : undefined
  }

  const ruleEvaluators = { 'min-age': minAgeError, lte: lteError }

  function businessRuleErrors(answers) {
    return (view.rules ?? [])
      .filter((rule) => !rule.when || evalCondition(rule.when, answers))
      .flatMap((rule) => ruleEvaluators[rule.kind]?.(rule, answers) ?? [])
  }

  return {
    toDomain,
    missingRequiredErrors,
    assembleQuote(answers) {
      const errors = [
        ...missingRequiredErrors(answers),
        ...businessRuleErrors(answers)
      ]
      return { ok: errors.length === 0, quote: toDomain(answers), errors }
    }
  }
}

function pad(value) {
  return String(value).padStart(DATE_PART_WIDTH, '0')
}

function isoDate(dob) {
  if (!dob || !dob.day || !dob.month || !dob.year) {
    return undefined
  }
  return `${dob.year}-${pad(dob.month)}-${pad(dob.day)}`
}
