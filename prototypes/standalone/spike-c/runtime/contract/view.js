import { fields, rules, stepById } from '../model.js'

/**
 * Step view/field reads over the model: the field specs of a step (with their
 * rule-derived `requiredWhen`) and the option lists a step renders.
 */

// A `require` rule's `when` becomes a field's requiredWhen, so the shared
// page-slice validator enforces the within-page conditional from the same data.
const requiredWhenFor = (fieldId) =>
  rules.find(
    (rule) => rule.kind === 'require' && (rule.require ?? []).includes(fieldId)
  )?.when

export function fieldsFor(stepId) {
  return Object.entries(fields)
    .filter(([, field]) => field.step === stepId)
    .map(([id, field]) => ({
      id,
      type: field.type,
      min: field.min,
      max: field.max,
      pattern: field.pattern,
      options: field.options,
      required: field.required === 'always',
      requiredWhen: requiredWhenFor(id)
    }))
}

export function viewItems(stepId, answers = {}) {
  const step = stepById.get(stepId)
  if (!step?.itemsFrom) {
    return undefined
  }
  const field = fields[step.itemsFrom]
  if (field.type === 'multi-select') {
    const selected = answers[step.itemsFrom] ?? []
    return field.options.map((option) => ({
      value: option.value,
      text: option.text,
      checked: selected.includes(option.value)
    }))
  }
  return field.options.map((option) => ({
    value: option.value,
    text: option.text,
    hint: option.hint ? { text: option.hint } : undefined,
    checked: answers[step.itemsFrom] === option.value
  }))
}
