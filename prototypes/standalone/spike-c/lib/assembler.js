import { evalCondition, provenance } from './conditions.js'
import { isSatisfied, humanize, ageInYears } from './fieldutil.js'
import { getSelectedAddons, allSelectedAddonsComplete } from './addons/index.js'

const BOOLEAN_TRUE_VALUE = 'yes'
const MSG_ADD_CLAIM = 'Add at least one claim'
const MSG_FINISH_ADDONS = 'Finish every add-on you selected'

const reasonFor = (entry) => ({
  field: entry.field,
  eq: entry.eq,
  reason: `You answered "${entry.eq}" for ${humanize(entry.field)}`
})

const transformField = (field, value) => {
  switch (field.type) {
    case 'date':
      return isoDate(value)
    case 'boolean':
      return value === BOOLEAN_TRUE_VALUE
    case 'number':
    case 'currency':
      return value === '' ? undefined : Number(value)
    default:
      return value
  }
}

const transformClaimAmount = (claim) => ({
  ...claim,
  claimAmount:
    claim.claimAmount === undefined ? undefined : Number(claim.claimAmount)
})

const transformLoopItems = (step, answers) =>
  (answers[step.arrayKey] ?? []).map(transformClaimAmount)

const scalarContribution = (step, answers) =>
  Object.fromEntries(
    (step.fields ?? [])
      .filter((field) => answers[field.id] !== undefined)
      .map((field) => [field.id, transformField(field, answers[field.id])])
  )

const stepContribution = (step, answers) => {
  const base = scalarContribution(step, answers)
  if (step.kind === 'loop') {
    return { ...base, [step.arrayKey]: transformLoopItems(step, answers) }
  }
  if (step.kind === 'subtasks') {
    return { ...base, selectedAddons: getSelectedAddons(answers) }
  }
  return base
}

const isFieldRequired = (field, answers) =>
  field.required ||
  (field.requiredWhen && evalCondition(field.requiredWhen, answers))

const loopMissingError = (stepId, step, answers, stepBecause) =>
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

const subtasksMissingError = (stepId, answers) =>
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

const requiredFieldErrors = (stepId, step, answers, stepBecause) =>
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

const ruleError = (rule) => ({
  stepId: rule.stepId,
  fieldId: rule.fieldId,
  message: rule.reason,
  because: []
})

const minAgeError = (rule, answers) => {
  const age = ageInYears(answers[rule.field])
  return age !== undefined && age < rule.min ? [ruleError(rule)] : []
}

const lteError = (rule, answers) => {
  const left = Number(answers[rule.left])
  const right = Number(answers[rule.right])
  return !Number.isNaN(left) && !Number.isNaN(right) && left > right
    ? [ruleError(rule)]
    : []
}

const RULE_HANDLERS = { 'min-age': minAgeError, lte: lteError }

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
  const toDomain = (answers) =>
    view.getApplicableSteps(answers).reduce(
      (quote, stepId) => ({
        ...quote,
        ...stepContribution(view.getStep(stepId), answers)
      }),
      {}
    )

  const missingRequiredErrors = (answers) =>
    view.getApplicableSteps(answers).flatMap((stepId) => {
      const step = view.getStep(stepId)
      const stepBecause = view.provenanceForStep(stepId, answers).map(reasonFor)
      if (step.kind === 'loop') {
        return loopMissingError(stepId, step, answers, stepBecause)
      }
      if (step.kind === 'subtasks') {
        return subtasksMissingError(stepId, answers)
      }
      return requiredFieldErrors(stepId, step, answers, stepBecause)
    })

  const businessRuleErrors = (answers) =>
    (view.rules ?? [])
      .filter((rule) => !rule.when || evalCondition(rule.when, answers))
      .flatMap((rule) => RULE_HANDLERS[rule.kind]?.(rule, answers) ?? [])

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
  return String(value).padStart(2, '0')
}

function isoDate(dob) {
  if (!dob || !dob.day || !dob.month || !dob.year) {
    return undefined
  }
  return `${dob.year}-${pad(dob.month)}-${pad(dob.day)}`
}
