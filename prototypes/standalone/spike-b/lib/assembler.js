import { evalCondition, provenance } from './conditions.js'
import { isSatisfied, humanize, ageInYears } from './fieldutil.js'
import { getSelectedAddons, allSelectedAddonsComplete } from './addons/index.js'

const STEP_KIND_LOOP = 'loop'
const STEP_KIND_SUBTASKS = 'subtasks'
const RULE_KIND_MIN_AGE = 'min-age'
const RULE_KIND_LTE = 'lte'

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
      return value === 'yes'
    case 'number':
    case 'currency':
      return value === '' ? undefined : Number(value)
    default:
      return value
  }
}

const transformStepFields = (step, answers) =>
  Object.fromEntries(
    (step.fields ?? [])
      .filter((field) => answers[field.id] !== undefined)
      .map((field) => [field.id, transformField(field, answers[field.id])])
  )

const transformLoopItems = (step, answers) =>
  (answers[step.arrayKey] ?? []).map((item) => ({
    ...item,
    claimAmount:
      item.claimAmount === undefined ? undefined : Number(item.claimAmount)
  }))

const loopMissingErrors = (step, stepId, stepBecause, answers) =>
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

const subtasksMissingErrors = (answers, stepId) =>
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

const fieldRequiredErrors = (step, stepId, stepBecause, answers) =>
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

const minAgeError = (rule, answers) => {
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

const lteError = (rule, answers) => {
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
    view.getApplicableSteps(answers).reduce((quote, stepId) => {
      const step = view.getStep(stepId)
      const loopPatch =
        step.kind === STEP_KIND_LOOP
          ? { [step.arrayKey]: transformLoopItems(step, answers) }
          : {}
      const subtasksPatch =
        step.kind === STEP_KIND_SUBTASKS
          ? { selectedAddons: getSelectedAddons(answers) }
          : {}
      return {
        ...quote,
        ...transformStepFields(step, answers),
        ...loopPatch,
        ...subtasksPatch
      }
    }, {})

  const missingRequiredErrors = (answers) =>
    view.getApplicableSteps(answers).flatMap((stepId) => {
      const step = view.getStep(stepId)
      const stepBecause = view.provenanceForStep(stepId, answers).map(reasonFor)
      if (step.kind === STEP_KIND_LOOP) {
        return loopMissingErrors(step, stepId, stepBecause, answers)
      }
      if (step.kind === STEP_KIND_SUBTASKS) {
        return subtasksMissingErrors(answers, stepId)
      }
      return fieldRequiredErrors(step, stepId, stepBecause, answers)
    })

  const businessRuleErrors = (answers) =>
    (view.rules ?? [])
      .filter((rule) => !(rule.when && !evalCondition(rule.when, answers)))
      .flatMap((rule) => {
        if (rule.kind === RULE_KIND_MIN_AGE) {
          return minAgeError(rule, answers) ?? []
        }
        if (rule.kind === RULE_KIND_LTE) {
          return lteError(rule, answers) ?? []
        }
        return []
      })

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
