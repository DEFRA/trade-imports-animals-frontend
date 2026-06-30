import { labelAndHint, legendAndHint } from './shared.js'

export const radiosView = (field, value) => ({
  type: 'radios',
  args: {
    name: field.name,
    ...legendAndHint(field),
    items: field.options.map((option) => ({
      value: option.value,
      text: option.text,
      checked: value === option.value
    }))
  }
})

export const checkboxesView = (field, value) => ({
  type: 'checkboxes',
  args: {
    name: field.name,
    ...legendAndHint(field),
    items: field.options.map((option) => ({
      value: option.value,
      text: option.text,
      checked: (value ?? []).includes(option.value)
    }))
  }
})

export const selectView = (field, value) => ({
  type: 'select',
  args: {
    id: field.name,
    name: field.name,
    ...labelAndHint(field),
    items: [
      { value: '', text: 'Choose…' },
      ...field.options.map((option) => ({
        value: option.value,
        text: option.text,
        selected: value === option.value
      }))
    ]
  }
})
