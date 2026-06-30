/**
 * The per-kind spec->GOV.UK-macro builders. `fieldToView(field, answers)` turns
 * one field spec plus the current answers into ready macro args for one input.
 *
 * Spec shape: { kind, name, label, hint?, options?, maxlength? }
 * kinds: text email tel number currency postcode textarea date radios
 *        checkboxes select
 */

const hintArg = (field) => (field.hint ? { text: field.hint } : undefined)
const labelArg = (field) => ({ text: field.label })

function inputArgs(field, value, overrides) {
  return {
    label: labelArg(field),
    id: field.name,
    name: field.name,
    hint: hintArg(field),
    value,
    ...overrides
  }
}

const inputView = (overrides) => (field, value) => ({
  type: 'input',
  args: inputArgs(field, value, overrides)
})

const textView = inputView()
const emailView = inputView({ type: 'email', spellcheck: false })
const telView = inputView({ type: 'tel', classes: 'govuk-input--width-20' })
const numberView = inputView({
  inputmode: 'numeric',
  classes: 'govuk-input--width-5'
})
const currencyView = inputView({
  inputmode: 'numeric',
  prefix: { text: '£' },
  classes: 'govuk-input--width-5'
})
const postcodeView = inputView({ classes: 'govuk-input--width-10' })

const textareaToView = (field, value) =>
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

const dateToView = (field, value) => {
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

const optionLegend = (field) => ({
  legend: { text: field.label, classes: 'govuk-fieldset__legend--m' }
})

const radiosToView = (field, value) => ({
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

const checkboxesToView = (field, value) => ({
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

const selectToView = (field, value) => ({
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

const VIEW_BUILDERS = {
  text: textView,
  email: emailView,
  tel: telView,
  number: numberView,
  currency: currencyView,
  postcode: postcodeView,
  textarea: textareaToView,
  date: dateToView,
  radios: radiosToView,
  checkboxes: checkboxesToView,
  select: selectToView
}

export function fieldToView(field, answers) {
  const value = answers[field.name]
  const builder = VIEW_BUILDERS[field.kind] ?? textView
  return builder(field, value)
}
