import { hintArg, legendArg } from './view-args.js'

// Multi-part / option-based kinds: date, radios, checkboxes and select.

export const dateView = (field, value) => {
  const date = value ?? {}
  return {
    type: 'date',
    args: {
      id: field.name,
      namePrefix: field.name,
      fieldset: { legend: { text: field.label } },
      hint: hintArg(field),
      items: [
        { name: 'day', classes: 'govuk-input--width-2', value: date.day },
        { name: 'month', classes: 'govuk-input--width-2', value: date.month },
        { name: 'year', classes: 'govuk-input--width-4', value: date.year }
      ]
    }
  }
}

export const radiosView = (field, value) => ({
  type: 'radios',
  args: {
    name: field.name,
    fieldset: legendArg(field),
    hint: hintArg(field),
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
    fieldset: legendArg(field),
    hint: hintArg(field),
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
    label: { text: field.label },
    hint: hintArg(field),
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
