/**
 * A tiny field-spec engine. A field spec is plain data describing one GDS form
 * input; `fieldsToView` turns a list of specs + the current answers into ready
 * GOV.UK macro arguments, which shared/partials/fields.njk renders. This keeps
 * pages data-driven; the add-on subtask steps are built from field specs.
 *
 * Spec shape: { kind, name, label, hint?, options?, maxlength? }
 * kinds: text email tel number currency postcode textarea date radios
 *        checkboxes select
 */

function inputArgs(field, value, extra) {
  return {
    label: { text: field.label },
    id: field.name,
    name: field.name,
    hint: field.hint ? { text: field.hint } : undefined,
    value,
    ...extra
  }
}

const labelAndHint = (field) => ({
  label: { text: field.label },
  hint: field.hint ? { text: field.hint } : undefined
})

const legendAndHint = (field) => ({
  fieldset: {
    legend: { text: field.label, classes: 'govuk-fieldset__legend--m' }
  },
  hint: field.hint ? { text: field.hint } : undefined
})

const textInputView = (field, value) => ({
  type: 'input',
  args: inputArgs(field, value)
})

const emailInputView = (field, value) => ({
  type: 'input',
  args: inputArgs(field, value, { type: 'email', spellcheck: false })
})

const telInputView = (field, value) => ({
  type: 'input',
  args: inputArgs(field, value, {
    type: 'tel',
    classes: 'govuk-input--width-20'
  })
})

const numberInputView = (field, value) => ({
  type: 'input',
  args: inputArgs(field, value, {
    inputmode: 'numeric',
    classes: 'govuk-input--width-5'
  })
})

const currencyInputView = (field, value) => ({
  type: 'input',
  args: inputArgs(field, value, {
    inputmode: 'numeric',
    prefix: { text: '£' },
    classes: 'govuk-input--width-5'
  })
})

const postcodeInputView = (field, value) => ({
  type: 'input',
  args: inputArgs(field, value, { classes: 'govuk-input--width-10' })
})

const textareaView = (field, value) =>
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

const dateView = (field, value) => {
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

const radiosView = (field, value) => ({
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

const checkboxesView = (field, value) => ({
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

const selectView = (field, value) => ({
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

const viewBuilders = {
  text: textInputView,
  email: emailInputView,
  tel: telInputView,
  number: numberInputView,
  currency: currencyInputView,
  postcode: postcodeInputView,
  textarea: textareaView,
  date: dateView,
  radios: radiosView,
  checkboxes: checkboxesView,
  select: selectView
}

const fieldToView = (field, answers) =>
  (viewBuilders[field.kind] ?? viewBuilders.text)(field, answers[field.name])

/**
 * Build view-ready GOV.UK macro args from a list of field specs + the current
 * answers + an optional error map.
 *
 * `errors` is the `{ fieldName: 'message' }` map returned by `validatePayload`.
 * For date inputs the error keys are the per-part names (e.g. `dateOfBirth-day`);
 * the first such message is shown as the combined `errorMessage` and each
 * erroring part gets the GOV.UK `govuk-input--error` class.
 */
export function fieldsToView(fields, answers = {}, errors = null) {
  return fields.map((field) => {
    const view = fieldToView(field, answers)
    if (errors) {
      attachError(view, field, errors)
    }
    return view
  })
}

function attachDateError(view, field, errors) {
  const partKeys = [
    `${field.name}-day`,
    `${field.name}-month`,
    `${field.name}-year`
  ]
  const firstMessage = partKeys
    .map((key) => errors[key])
    .find((message) => message)
  if (!firstMessage) {
    return
  }
  view.args.errorMessage = { text: firstMessage }
  view.args.items = view.args.items.map((item) =>
    errors[`${field.name}-${item.name}`]
      ? {
          ...item,
          classes: `${item.classes ?? ''} govuk-input--error`.trim()
        }
      : item
  )
}

function attachError(view, field, errors) {
  if (field.kind === 'date') {
    return attachDateError(view, field, errors)
  }
  const message = errors[field.name]
  if (message) {
    view.args.errorMessage = { text: message }
  }
}

const readFieldValue = (field, payload) => {
  if (field.kind === 'date') {
    return {
      day: payload[`${field.name}-day`],
      month: payload[`${field.name}-month`],
      year: payload[`${field.name}-year`]
    }
  }
  if (field.kind === 'checkboxes') {
    const raw = payload[field.name]
    return raw === undefined ? [] : [].concat(raw)
  }
  return payload[field.name]
}

/** Read submitted values for a list of specs back into a quote patch. */
export function collectFields(fields, payload) {
  return Object.fromEntries(
    fields.map((field) => [field.name, readFieldValue(field, payload)])
  )
}
