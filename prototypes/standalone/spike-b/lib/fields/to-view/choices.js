import { hintFor } from './hint.js'

/**
 * Option-list GOV.UK macro views: radios, checkboxes and select.
 */

const choiceFieldset = (field) => ({
  legend: {
    text: field.label,
    classes: 'govuk-fieldset__legend--m'
  }
})

const optionItems = (options, isChecked) =>
  options.map((option) => ({
    value: option.value,
    text: option.text,
    checked: isChecked(option.value)
  }))

export const radiosView = (field, value) => ({
  type: 'radios',
  args: {
    name: field.name,
    fieldset: choiceFieldset(field),
    hint: hintFor(field),
    items: optionItems(field.options, (optionValue) => value === optionValue)
  }
})

export const checkboxesView = (field, value) => ({
  type: 'checkboxes',
  args: {
    name: field.name,
    fieldset: choiceFieldset(field),
    hint: hintFor(field),
    items: optionItems(field.options, (optionValue) =>
      (value ?? []).includes(optionValue)
    )
  }
})

export const selectView = (field, value) => ({
  type: 'select',
  args: {
    id: field.name,
    name: field.name,
    label: { text: field.label },
    hint: hintFor(field),
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
