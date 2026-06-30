import { stepMeta, options, fieldType } from './step-meta.js'

const toMultiSelectItem = (option, selected) => ({
  value: option.value,
  text: option.text,
  checked: selected.includes(option.value)
})

const toSingleSelectItem = (option, answer) => ({
  value: option.value,
  text: option.text,
  hint: option.hint ? { text: option.hint } : undefined,
  checked: answer === option.value
})

export function viewItems(stepId, answers = {}) {
  const sourceKey = stepMeta[stepId]?.itemsFrom
  if (!sourceKey) {
    return undefined
  }
  const sourceOptions = options[sourceKey] ?? []
  if (fieldType[sourceKey] === 'multi-select') {
    const selected = answers[sourceKey] ?? []
    return sourceOptions.map((option) => toMultiSelectItem(option, selected))
  }
  return sourceOptions.map((option) =>
    toSingleSelectItem(option, answers[sourceKey])
  )
}
