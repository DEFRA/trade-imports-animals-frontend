import { stepMeta, options, fieldType } from './step-meta.js'

export function viewItems(stepId, answers = {}) {
  const from = stepMeta[stepId]?.itemsFrom
  if (!from) {
    return undefined
  }
  const opts = options[from] ?? []
  if (fieldType[from] === 'multi-select') {
    const selected = answers[from] ?? []
    return opts.map((option) => ({
      value: option.value,
      text: option.text,
      checked: selected.includes(option.value)
    }))
  }
  return opts.map((option) => ({
    value: option.value,
    text: option.text,
    hint: option.hint ? { text: option.hint } : undefined,
    checked: answers[from] === option.value
  }))
}
