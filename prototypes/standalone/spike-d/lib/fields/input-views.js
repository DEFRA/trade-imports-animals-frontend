import { inputArgs, hintArg } from './view-args.js'

// Single-input kinds: text-like inputs and the textarea/character-count.

export const textInputView = (field, value) => ({
  type: 'input',
  args: inputArgs(field, value)
})

export const emailInputView = (field, value) => ({
  type: 'input',
  args: inputArgs(field, value, { type: 'email', spellcheck: false })
})

export const telInputView = (field, value) => ({
  type: 'input',
  args: inputArgs(field, value, {
    type: 'tel',
    classes: 'govuk-input--width-20'
  })
})

export const numberInputView = (field, value) => ({
  type: 'input',
  args: inputArgs(field, value, {
    inputmode: 'numeric',
    classes: 'govuk-input--width-5'
  })
})

export const currencyInputView = (field, value) => ({
  type: 'input',
  args: inputArgs(field, value, {
    inputmode: 'numeric',
    prefix: { text: '£' },
    classes: 'govuk-input--width-5'
  })
})

export const postcodeInputView = (field, value) => ({
  type: 'input',
  args: inputArgs(field, value, { classes: 'govuk-input--width-10' })
})

export const textareaView = (field, value) => {
  const base = {
    id: field.name,
    name: field.name,
    label: { text: field.label },
    hint: hintArg(field),
    value
  }
  return field.maxlength
    ? { type: 'charactercount', args: { ...base, maxlength: field.maxlength } }
    : { type: 'textarea', args: base }
}
