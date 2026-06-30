import { labelAndHint } from './shared.js'

export const textareaView = (field, value) =>
  field.maxlength
    ? {
        type: 'charactercount',
        args: {
          id: field.name,
          name: field.name,
          ...labelAndHint(field),
          maxlength: field.maxlength,
          value
        }
      }
    : {
        type: 'textarea',
        args: {
          id: field.name,
          name: field.name,
          ...labelAndHint(field),
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
      hint: field.hint ? { text: field.hint } : undefined,
      items: [
        { name: 'day', classes: 'govuk-input--width-2', value: date.day },
        { name: 'month', classes: 'govuk-input--width-2', value: date.month },
        { name: 'year', classes: 'govuk-input--width-4', value: date.year }
      ]
    }
  }
}
