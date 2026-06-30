import { check } from '../validation/index.js'
import { evalCondition } from '../lib/conditions.js'
import { humanize, ageInYears } from '../lib/fieldutil.js'
import { allSelectedAddonsComplete } from '../lib/addons/index.js'
import { makeAssembler } from '../lib/domain.js'
import { annotations } from './annotations.js'
import { stepMeta, fieldStep, fieldsFor } from './step-meta.js'
import { applicableSteps, requiredBecause } from './applicability.js'

// Transform reuses the shared core; D supplies its schema-derived field types.
const transformer = makeAssembler({
  getApplicableSteps: applicableSteps,
  getStep: (stepId) => ({
    id: stepId,
    kind: stepMeta[stepId]?.kind,
    fields: fieldsFor(stepId),
    done: stepMeta[stepId]?.done,
    arrayKey: stepMeta[stepId]?.arrayKey
  }),
  provenanceForStep: () => [],
  rules: []
})

const HAD_CLAIMS_YES = 'yes'

const toError = (rule, message) => ({
  stepId: rule.stepId,
  fieldId: rule.fieldId,
  message,
  because: []
})

const minAgeError = (rule, answers) => {
  const age = ageInYears(answers[rule.field])
  return age !== undefined && age < rule.min
    ? toError(rule, rule.reason)
    : undefined
}

const lteError = (rule, answers) => {
  const left = Number(answers[rule.left])
  const right = Number(answers[rule.right])
  return !Number.isNaN(left) && !Number.isNaN(right) && left > right
    ? toError(rule, rule.reason)
    : undefined
}

const ruleEvaluators = { 'min-age': minAgeError, lte: lteError }

const ruleApplies = (answers) => (rule) =>
  !rule.when || evalCondition(rule.when, answers)

function businessRuleErrors(answers) {
  return (annotations.businessRules ?? [])
    .filter(ruleApplies(answers))
    .flatMap((rule) => ruleEvaluators[rule.kind]?.(rule, answers) ?? [])
}

const requiredErrors = (missing) =>
  missing
    .filter((entry) => entry.path !== 'claims') // the loop owns its own completeness
    .map((entry) => ({
      stepId: fieldStep[entry.path] ?? entry.path,
      fieldId: entry.path,
      message: `${humanize(entry.path)} is required`,
      because: entry.because
    }))

const invalidErrors = (invalid) =>
  invalid.map((entry) => ({
    stepId: fieldStep[entry.path] ?? entry.path,
    fieldId: entry.path,
    message: entry.message,
    because: []
  }))

const addonErrors = (answers) =>
  allSelectedAddonsComplete(answers)
    ? []
    : [
        {
          stepId: 'addons',
          fieldId: 'selectedAddons',
          message: 'Finish every add-on you selected',
          because: []
        }
      ]

// hadClaims = yes still needs at least one claim (schema minItems on the array)
const claimsErrors = (answers) =>
  answers.hadClaims === HAD_CLAIMS_YES && !(answers.claims ?? []).length
    ? [
        {
          stepId: 'claims',
          fieldId: 'claims',
          message: 'Add at least one claim',
          because: requiredBecause('claims', answers)
        }
      ]
    : []

export function assembleQuote(answers) {
  const { missing, invalid } = check(answers)
  const errors = [
    ...requiredErrors(missing),
    ...invalidErrors(invalid),
    ...businessRuleErrors(answers),
    ...addonErrors(answers),
    ...claimsErrors(answers)
  ]
  return {
    ok: errors.length === 0,
    quote: transformer.toDomain(answers),
    errors
  }
}
