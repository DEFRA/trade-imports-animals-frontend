import { hintArg, labelArg } from './input-fields.js'

/** The choose-from-options family (radios / checkboxes / select). */

const optionLegend = (field) => ({
  legend: { text: field.label, classes: 'govuk-fieldset__legend--m' }
})

export const radiosToView = (field, value) => ({
  type: 'radios',
  args: {
    name: field.name,
    fieldset: optionLegend(field),
    hint: hintArg(field),
    items: field.options.map((option) => ({
      value: option.value,
      text: option.text,
      checked: value === option.value
    }))
  }
})

export const checkboxesToView = (field, value) => ({
  type: 'checkboxes',
  args: {
    name: field.name,
    fieldset: optionLegend(field),
    hint: hintArg(field),
    items: field.options.map((option) => ({
      value: option.value,
      text: option.text,
      checked: (value ?? []).includes(option.value)
    }))
  }
})

export const selectToView = (field, value) => ({
  type: 'select',
  args: {
    id: field.name,
    name: field.name,
    label: labelArg(field),
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
