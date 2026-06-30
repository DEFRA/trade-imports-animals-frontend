import { model } from '../runtime/model.js'
import { evalCondition, provenance } from '../runtime/conditions.js'
import { isSatisfied, humanize, ageInYears } from '../runtime/util.js'
import { getSelectedAddons, allSelectedAddonsComplete } from '../lib/addons.js'

/**
 * Whole-object validation + transform (validation.md moment 4). Two-shape
 * strategy: the journey stores **form-shaped** answers; here we (1) check every
 * applicable required field is present, (2) transform to a **domain** quote
 * object, (3) run the declarative holistic business rules. Returns
 * `{ ok, quote, errors }` with step provenance on every error.
 *
 * `toDomain` is exported so the one-shape strategy (normalise at collect, keep
 * one shape throughout) can be unit-tested and compared — see ../README.md.
 */

const FIELD_TYPE = Object.freeze({
  DATE: 'date',
  BOOLEAN: 'boolean',
  NUMBER: 'number',
  CURRENCY: 'currency'
})
const STEP_KIND = Object.freeze({ LOOP: 'loop', SUBTASKS: 'subtasks' })
const RULE_KIND = Object.freeze({ MIN_AGE: 'min-age', LTE: 'lte' })
const YES = 'yes'

const applicableSteps = (answers) =>
  model.steps.filter((step) => evalCondition(step.appliesWhen, answers))

function reasonFor(entry) {
  return {
    field: entry.field,
    eq: entry.eq,
    reason: `You answered "${entry.eq}" for ${humanize(entry.field)}`
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

function transformField(field, value) {
  switch (field.type) {
    case FIELD_TYPE.DATE:
      return isoDate(value)
    case FIELD_TYPE.BOOLEAN:
      return value === YES
    case FIELD_TYPE.NUMBER:
    case FIELD_TYPE.CURRENCY:
      return value === '' ? undefined : Number(value)
    default:
      return value
  }
}

const transformFields = (answers) =>
  Object.fromEntries(
    applicableSteps(answers).flatMap((step) =>
      (step.fields ?? [])
        .filter((field) => answers[field.id] !== undefined)
        .map((field) => [field.id, transformField(field, answers[field.id])])
    )
  )

const transformClaims = (answers) =>
  (answers.claims ?? []).map((claim) => ({
    claimType: claim.claimType,
    claimAmount:
      claim.claimAmount === undefined ? undefined : Number(claim.claimAmount)
  }))

/** Form answers → domain quote object (ISO dates, booleans, numbers, enums). */
export function toDomain(answers) {
  return {
    ...transformFields(answers),
    ...(answers.hadClaims === YES ? { claims: transformClaims(answers) } : {}),
    selectedAddons: getSelectedAddons(answers)
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

const minAgeError = (rule, answers) => {
  const age = ageInYears(answers[rule.field])
  if (age === undefined || age >= rule.min) {
    return null
  }
  return {
    stepId: rule.stepId,
    fieldId: rule.fieldId,
    message: rule.reason,
    because: []
  }
}

const lteError = (rule, answers) => {
  const left = Number(answers[rule.left])
  const right = Number(answers[rule.right])
  if (Number.isNaN(left) || Number.isNaN(right) || left <= right) {
    return null
  }
  return {
    stepId: rule.stepId,
    fieldId: rule.fieldId,
    message: rule.reason,
    because: []
  }
}

const ruleEvaluators = {
  [RULE_KIND.MIN_AGE]: minAgeError,
  [RULE_KIND.LTE]: lteError
}

const ruleError = (rule, answers) => {
  const evaluate = ruleEvaluators[rule.kind]
  return evaluate ? evaluate(rule, answers) : null
}

function businessRuleErrors(answers) {
  return (model.rules ?? [])
    .filter((rule) => !rule.when || evalCondition(rule.when, answers))
    .map((rule) => ruleError(rule, answers))
    .filter(Boolean)
}

export function assembleQuote(answers) {
  const errors = [
    ...missingRequiredErrors(answers),
    ...businessRuleErrors(answers)
  ]
  return { ok: errors.length === 0, quote: toDomain(answers), errors }
}
