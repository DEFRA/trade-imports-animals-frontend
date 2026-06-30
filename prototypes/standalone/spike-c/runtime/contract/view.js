import { fields, rules, stepById } from '../model.js'

/**
 * Step view/field reads over the model: the field specs of a step (with their
 * rule-derived `requiredWhen`) and the option lists a step renders.
 */

const RULE_REQUIRE = 'require'
const REQUIRED_ALWAYS = 'always'
const TYPE_MULTI_SELECT = 'multi-select'

// A `require` rule's `when` becomes a field's requiredWhen, so the shared
// page-slice validator enforces the within-page conditional from the same data.
const requiredWhenFor = (fieldId) =>
  rules.find(
    (rule) =>
      rule.kind === RULE_REQUIRE && (rule.require ?? []).includes(fieldId)
  )?.when

const checkboxItems = (field, selected) =>
  field.options.map((option) => ({
    value: option.value,
    text: option.text,
    checked: selected.includes(option.value)
  }))

const radioItems = (field, answer) =>
  field.options.map((option) => ({
    value: option.value,
    text: option.text,
    hint: option.hint ? { text: option.hint } : undefined,
    checked: answer === option.value
  }))

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
      required: field.required === REQUIRED_ALWAYS,
      requiredWhen: requiredWhenFor(id)
    }))
}

export function viewItems(stepId, answers = {}) {
  const step = stepById.get(stepId)
  if (!step?.itemsFrom) {
    return undefined
  }
  const field = fields[step.itemsFrom]
  return field.type === TYPE_MULTI_SELECT
    ? checkboxItems(field, answers[step.itemsFrom] ?? [])
    : radioItems(field, answers[step.itemsFrom])
}
