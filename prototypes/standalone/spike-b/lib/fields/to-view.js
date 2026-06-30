/**
 * Field-spec → GOV.UK macro args. `fieldToView` maps one plain field spec + the
 * current answers into the macro arguments shared/partials/fields.njk renders;
 * `attachError` overlays the error message + error classes onto a built view.
 *
 * Spec shape: { kind, name, label, hint?, options?, maxlength? }
 * kinds: text email tel number currency postcode textarea date radios
 *        checkboxes select
 */

const DATE_PARTS = ['day', 'month', 'year']

const hintFor = (field) => (field.hint ? { text: field.hint } : undefined)

const inputArgs = (field, value, extra) => ({
  label: { text: field.label },
  id: field.name,
  name: field.name,
  hint: hintFor(field),
  value,
  ...extra
})

const inputView = (field, value, extra) => ({
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

const textareaView = (field, value) =>
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

const dateView = (field, value) => {
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

const radiosView = (field, value) => ({
  type: 'radios',
  args: {
    name: field.name,
    fieldset: choiceFieldset(field),
    hint: hintFor(field),
    items: optionItems(field.options, (optionValue) => value === optionValue)
  }
})

const checkboxesView = (field, value) => ({
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

const selectView = (field, value) => ({
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

const fieldViewBuilders = {
  text: (field, value) => inputView(field, value),
  email: (field, value) =>
    inputView(field, value, { type: 'email', spellcheck: false }),
  tel: (field, value) =>
    inputView(field, value, { type: 'tel', classes: 'govuk-input--width-20' }),
  number: (field, value) =>
    inputView(field, value, {
      inputmode: 'numeric',
      classes: 'govuk-input--width-5'
    }),
  currency: (field, value) =>
    inputView(field, value, {
      inputmode: 'numeric',
      prefix: { text: '£' },
      classes: 'govuk-input--width-5'
    }),
  postcode: (field, value) =>
    inputView(field, value, { classes: 'govuk-input--width-10' }),
  textarea: textareaView,
  date: dateView,
  radios: radiosView,
  checkboxes: checkboxesView,
  select: selectView
}

export function fieldToView(field, data) {
  const value = data[field.name]
  const build = fieldViewBuilders[field.kind] ?? fieldViewBuilders.text
  return build(field, value)
}

const itemWithError = (item, errors, namePrefix) =>
  errors[`${namePrefix}-${item.name}`]
    ? { ...item, classes: `${item.classes ?? ''} govuk-input--error`.trim() }
    : item

const attachDateError = (view, field, errors) => {
  const partKeys = DATE_PARTS.map((part) => `${field.name}-${part}`)
  const firstMessage = partKeys
    .map((key) => errors[key])
    .find((message) => message)
  if (firstMessage) {
    view.args.errorMessage = { text: firstMessage }
    view.args.items = view.args.items.map((item) =>
      itemWithError(item, errors, field.name)
    )
  }
}

export function attachError(view, field, errors) {
  if (field.kind === 'date') {
    attachDateError(view, field, errors)
    return
  }
  const message = errors[field.name]
  if (message) {
    view.args.errorMessage = { text: message }
  }
}
