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

function businessRuleErrors(answers) {
  const out = []
  for (const rule of annotations.businessRules ?? []) {
    if (rule.when && !evalCondition(rule.when, answers)) {
      continue
    }
    if (rule.kind === 'min-age') {
      const age = ageInYears(answers[rule.field])
      if (age !== undefined && age < rule.min) {
        out.push({
          stepId: rule.stepId,
          fieldId: rule.fieldId,
          message: rule.reason,
          because: []
        })
      }
    }
    if (rule.kind === 'lte') {
      const left = Number(answers[rule.left])
      const right = Number(answers[rule.right])
      if (!Number.isNaN(left) && !Number.isNaN(right) && left > right) {
        out.push({
          stepId: rule.stepId,
          fieldId: rule.fieldId,
          message: rule.reason,
          because: []
        })
      }
    }
  }
  return out
}

export function assembleQuote(answers) {
  const { missing, invalid } = check(answers)
  const errors = [
    ...missing
      .filter((entry) => entry.path !== 'claims') // the loop owns its own completeness
      .map((entry) => ({
        stepId: fieldStep[entry.path] ?? entry.path,
        fieldId: entry.path,
        message: `${humanize(entry.path)} is required`,
        because: entry.because
      })),
    ...invalid.map((entry) => ({
      stepId: fieldStep[entry.path] ?? entry.path,
      fieldId: entry.path,
      message: entry.message,
      because: []
    })),
    ...businessRuleErrors(answers)
  ]
  if (!allSelectedAddonsComplete(answers)) {
    errors.push({
      stepId: 'addons',
      fieldId: 'selectedAddons',
      message: 'Finish every add-on you selected',
      because: []
    })
  }
  // hadClaims = yes still needs at least one claim (schema minItems on the array)
  if (answers.hadClaims === 'yes' && !(answers.claims ?? []).length) {
    errors.push({
      stepId: 'claims',
      fieldId: 'claims',
      message: 'Add at least one claim',
      because: requiredBecause('claims', answers)
    })
  }
  return {
    ok: errors.length === 0,
    quote: transformer.toDomain(answers),
    errors
  }
}
