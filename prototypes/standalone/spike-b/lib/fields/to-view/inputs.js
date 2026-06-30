import { hintFor } from './hint.js'

/**
 * Free-text / single-value GOV.UK macro views: text-like inputs, the textarea /
 * character-count pair and the day/month/year date input.
 */

const inputArgs = (field, value, extra) => ({
  label: { text: field.label },
  id: field.name,
  name: field.name,
  hint: hintFor(field),
  value,
  ...extra
})

export const inputView = (field, value, extra) => ({
  type: 'input',
  args: inputArgs(field, value, extra)
})

const charactercountView = (field, value) => ({
  type: 'charactercount',
  args: {
    id: field.name,
    name: field.name,
    label: { text: field.label },
    hint: hintFor(field),
    maxlength: field.maxlength,
    value
  }
})

export const textareaView = (field, value) =>
  field.maxlength
    ? charactercountView(field, value)
    : {
        type: 'textarea',
        args: {
          id: field.name,
          name: field.name,
          label: { text: field.label },
          hint: hintFor(field),
          value
        }
      }

export const dateView = (field, value) => {
  const date = value ?? {}
  return {
    type: 'date',
    args: {
      id: field.name,
      namePrefix: field.name,
      fieldset: { legend: { text: field.label } },
      hint: hintFor(field),
      items: [
        { name: 'day', classes: 'govuk-input--width-2', value: date.day },
        { name: 'month', classes: 'govuk-input--width-2', value: date.month },
        { name: 'year', classes: 'govuk-input--width-4', value: date.year }
      ]
    }
  }
}
