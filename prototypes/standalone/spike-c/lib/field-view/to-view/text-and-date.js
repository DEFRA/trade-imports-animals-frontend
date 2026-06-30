import { hintArg, labelArg } from './input-fields.js'

/** The free-text + date-input builders (textarea / character count / date). */

export const textareaToView = (field, value) =>
  field.maxlength
    ? {
        type: 'charactercount',
        args: {
          id: field.name,
          name: field.name,
          label: labelArg(field),
          hint: hintArg(field),
          maxlength: field.maxlength,
          value
        }
      }
    : {
        type: 'textarea',
        args: {
          id: field.name,
          name: field.name,
          label: labelArg(field),
          hint: hintArg(field),
          value
        }
      }

export const dateToView = (field, value) => {
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
