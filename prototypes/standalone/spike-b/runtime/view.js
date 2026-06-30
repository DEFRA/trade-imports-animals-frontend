import { machine } from './model.js'
import { fieldSpec } from './steps.js'

/**
 * Option-list view model for a step — turns the field a step draws its options
 * from into GOV.UK radio/checkbox items, marking the currently-selected ones.
 * Returns `undefined` for steps with no option source.
 */
export function viewItems(stepId, answers = {}) {
  const state = machine.states[stepId]
  if (!state?.itemsFrom) {
    return undefined
  }
  const field = fieldSpec(state.itemsFrom)
  if (field.type === 'multi-select') {
    const selected = answers[field.id] ?? []
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
    checked: answers[field.id] === option.value
  }))
}
