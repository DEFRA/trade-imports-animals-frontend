import { machine } from './model.js'
import { fieldSpec } from './steps.js'

/**
 * Option-list view model for a step — turns the field a step draws its options
 * from into GOV.UK radio/checkbox items, marking the currently-selected ones.
 * Returns `undefined` for steps with no option source.
 */
const MULTI_SELECT = 'multi-select'

const multiSelectItems = (field, answers) => {
  const selected = answers[field.id] ?? []
  return field.options.map((option) => ({
    value: option.value,
    text: option.text,
    checked: selected.includes(option.value)
  }))
}

const singleSelectItems = (field, answers) =>
  field.options.map((option) => ({
    value: option.value,
    text: option.text,
    hint: option.hint ? { text: option.hint } : undefined,
    checked: answers[field.id] === option.value
  }))

export function viewItems(stepId, answers = {}) {
  const state = machine.states[stepId]
  if (!state?.itemsFrom) {
    return undefined
  }
  const field = fieldSpec(state.itemsFrom)
  return field.type === MULTI_SELECT
    ? multiSelectItems(field, answers)
    : singleSelectItems(field, answers)
}
