import { model } from '../runtime/model.js'
import { evalCondition, provenance } from '../runtime/conditions.js'
import { isSatisfied, humanize, ageInYears } from '../runtime/util.js'
import {
  getSelectedAddons,
  allSelectedAddonsComplete
} from '../../../shared/addons.js'

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

/** Form answers → domain quote object (ISO dates, booleans, numbers, enums). */
export function toDomain(answers) {
  const quote = {}
  for (const step of applicableSteps(answers)) {
    for (const field of step.fields ?? []) {
      const value = answers[field.id]
      if (value === undefined) {
        continue
      }
      quote[field.id] = transformField(field, value)
    }
  }
  if (answers.hadClaims === 'yes') {
    quote.claims = (answers.claims ?? []).map((claim) => ({
      claimType: claim.claimType,
      claimAmount:
        claim.claimAmount === undefined ? undefined : Number(claim.claimAmount)
    }))
  }
  quote.selectedAddons = getSelectedAddons(answers)
  return quote
}

function transformField(field, value) {
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

export function missingRequiredErrors(answers) {
  const errors = []
  for (const step of applicableSteps(answers)) {
    if (step.kind === 'loop') {
      if (!(answers[step.arrayKey] ?? []).length) {
        errors.push({
          stepId: step.id,
          fieldId: step.arrayKey,
          message: 'Add at least one claim',
          because: provenance(step.appliesWhen).map(reasonFor)
        })
      }
      continue
    }
    if (step.kind === 'subtasks') {
      if (!allSelectedAddonsComplete(answers)) {
        errors.push({
          stepId: step.id,
          fieldId: 'selectedAddons',
          message: 'Finish every add-on you selected',
          because: []
        })
      }
      continue
    }
    for (const field of step.fields ?? []) {
      const required =
        field.required ||
        (field.requiredWhen && evalCondition(field.requiredWhen, answers))
      if (required && !isSatisfied(field, answers[field.id])) {
        const because = [
          ...provenance(step.appliesWhen),
          ...provenance(field.requiredWhen)
        ].map(reasonFor)
        errors.push({
          stepId: step.id,
          fieldId: field.id,
          message: `${humanize(field.id)} is required`,
          because
        })
      }
    }
  }
  return errors
}

function businessRuleErrors(answers) {
  const errors = []
  for (const rule of model.rules ?? []) {
    if (rule.when && !evalCondition(rule.when, answers)) {
      continue
    }
    if (rule.kind === 'min-age') {
      const age = ageInYears(answers[rule.field])
      if (age !== undefined && age < rule.min) {
        errors.push({
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
        errors.push({
          stepId: rule.stepId,
          fieldId: rule.fieldId,
          message: rule.reason,
          because: []
        })
      }
    }
  }
  return errors
}

export function assembleQuote(answers) {
  const errors = [
    ...missingRequiredErrors(answers),
    ...businessRuleErrors(answers)
  ]
  return { ok: errors.length === 0, quote: toDomain(answers), errors }
}
