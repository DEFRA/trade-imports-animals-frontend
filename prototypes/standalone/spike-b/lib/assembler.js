import { evalCondition, provenance } from './conditions.js'
import { isSatisfied, humanize, ageInYears } from './fieldutil.js'
import { getSelectedAddons, allSelectedAddonsComplete } from './addons/index.js'

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

  function toDomain(answers) {
    const quote = {}
    for (const stepId of view.getApplicableSteps(answers)) {
      const step = view.getStep(stepId)
      for (const field of step.fields ?? []) {
        const value = answers[field.id]
        if (value !== undefined) {
          quote[field.id] = transformField(field, value)
        }
      }
      if (step.kind === 'loop') {
        quote[step.arrayKey] = (answers[step.arrayKey] ?? []).map((item) => ({
          ...item,
          claimAmount:
            item.claimAmount === undefined
              ? undefined
              : Number(item.claimAmount)
        }))
      }
      if (step.kind === 'subtasks') {
        quote.selectedAddons = getSelectedAddons(answers)
      }
    }
    return quote
  }

  function missingRequiredErrors(answers) {
    const errors = []
    for (const stepId of view.getApplicableSteps(answers)) {
      const step = view.getStep(stepId)
      const stepBecause = view.provenanceForStep(stepId, answers).map(reasonFor)
      if (step.kind === 'loop') {
        if (!(answers[step.arrayKey] ?? []).length) {
          errors.push({
            stepId,
            fieldId: step.arrayKey,
            message: 'Add at least one claim',
            because: stepBecause
          })
        }
        continue
      }
      if (step.kind === 'subtasks') {
        if (!allSelectedAddonsComplete(answers)) {
          errors.push({
            stepId,
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
          errors.push({
            stepId,
            fieldId: field.id,
            message: `${humanize(field.id)} is required`,
            because: [
              ...stepBecause,
              ...provenance(field.requiredWhen).map(reasonFor)
            ]
          })
        }
      }
    }
    return errors
  }

  function businessRuleErrors(answers) {
    const errors = []
    for (const rule of view.rules ?? []) {
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
