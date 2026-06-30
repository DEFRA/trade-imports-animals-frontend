import { stepById } from '../model.js'
import { FIELD_TYPE } from './constants.js'

export const stepKind = (id) => stepById.get(id)?.kind
export const stepTitle = (id) => stepById.get(id)?.title

export function fieldsFor(stepId) {
  const step = stepById.get(stepId)
  return (step.fields ?? []).map((field) => ({
    id: field.id,
    type: field.type,
    constraints: {
      required: Boolean(field.required),
      requiredWhen: field.requiredWhen,
      min: field.min,
      max: field.max,
      pattern: field.pattern,
      options: field.options
    }
  }))
}

function multiSelectItems(field, answers) {
  const selected = answers[field.id] ?? []
  return field.options.map((option) => ({
    value: option.value,
    text: option.text,
    checked: selected.includes(option.value)
  }))
}

function singleSelectItems(field, answers) {
  return field.options.map((option) => ({
    value: option.value,
    text: option.text,
    hint: option.hint ? { text: option.hint } : undefined,
    checked: answers[field.id] === option.value
  }))
}

export function viewItems(stepId, answers = {}) {
  const step = stepById.get(stepId)
  if (!step?.itemsFrom) {
    return undefined
  }
  const field = (step.fields ?? []).find((field) => field.id === step.itemsFrom)
  if (!field) {
    return undefined
  }
  return field.type === FIELD_TYPE.MULTI_SELECT
    ? multiSelectItems(field, answers)
    : singleSelectItems(field, answers)
}
